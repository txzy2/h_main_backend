import {Injectable} from '@nestjs/common';
import {
    Activity,
    Booking,
    BookingAction,
    BookingActionType,
    BookingStatus,
    Location,
    LocationTables,
    Prisma
} from '@prisma/client';
import {AppLoggerService} from '@/common/logger/logger.service';
import {PrismaService} from '@/prisma/prisma.service';

export const BOOKINGS_REPOSITORY = Symbol('BOOKINGS_REPOSITORY');

export const DEFAULT_BOOKING_DURATION_MINUTES = 120;
export const MAX_BOOKING_DURATION_MINUTES = 12 * 60;

const MINUTE_MS = 60 * 1000;

export interface AvailableTableResult {
    tableId: number | null;
    hasTables: boolean;
}

export type BookingWithDetails = Booking & {
    location: {name: string; orgId: number};
    table: {name: string | null} | null;
    actions: BookingAction[];
};

export interface CreateBookingAction {
    userExtId: string;
    comment?: string;
}

export interface IBookingsRepository {
    findActiveLocation(locationId: number, orgId: number): Promise<Location | null>;
    findTable(tableId: number, locationId: number): Promise<LocationTables | null>;
    isTableAvailable(
        tableId: number,
        scheduledAt: Date,
        durationMinutes: number,
        excludeBookingId?: number
    ): Promise<boolean>;
    pickAvailableTable(
        locationId: number,
        scheduledAt: Date,
        durationMinutes: number
    ): Promise<AvailableTableResult>;
    create(data: Prisma.BookingUncheckedCreateInput, action: CreateBookingAction): Promise<Booking>;
    findBookingDetails(id: number): Promise<BookingWithDetails | null>;
    findUserNameByExtId(extId: string): Promise<string | null>;
    startBooking(id: number, seatedAt: Date, userExtId: string): Promise<void>;
    extendBooking(
        id: number,
        durationMinutes: number,
        addedMinutes: number,
        userExtId: string,
        comment?: string
    ): Promise<void>;
    closeBooking(
        id: number,
        data: {
            amount: number;
            completedAt: Date;
            seatedAt: Date;
            userExtId: string;
            comment?: string;
        }
    ): Promise<void>;
    cancelBooking(
        id: number,
        data: {userExtId: string; reason: string}
    ): Promise<void>;
}

@Injectable()
export class BookingsRepository implements IBookingsRepository {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(BookingsRepository.name);
    }

    public async findActiveLocation(
        locationId: number,
        orgId: number
    ): Promise<Location | null> {
        return this.prisma.location.findFirst({
            where: {id: locationId, orgId, status: Activity.Active}
        });
    }

    public async findTable(
        tableId: number,
        locationId: number
    ): Promise<LocationTables | null> {
        return this.prisma.locationTables.findFirst({
            where: {id: tableId, locationId}
        });
    }

    public async isTableAvailable(
        tableId: number,
        scheduledAt: Date,
        durationMinutes: number,
        excludeBookingId?: number
    ): Promise<boolean> {
        const start = scheduledAt.getTime();
        const end = start + durationMinutes * MINUTE_MS;
        const windowMs = MAX_BOOKING_DURATION_MINUTES * MINUTE_MS;
        const conflicts = await this.prisma.booking.findMany({
            where: {
                tableId,
                ...(excludeBookingId ? {id: {not: excludeBookingId}} : {}),
                status: {notIn: [BookingStatus.Cancelled, BookingStatus.Completed]},
                scheduledAt: {
                    gte: new Date(start - windowMs),
                    lt: new Date(end + windowMs)
                }
            },
            select: {scheduledAt: true, durationMinutes: true}
        });

        return !conflicts.some(booking => {
            const bookingStart = booking.scheduledAt.getTime();
            const bookingEnd =
                bookingStart + booking.durationMinutes * MINUTE_MS;

            return bookingStart < end && start < bookingEnd;
        });
    }

    public async pickAvailableTable(
        locationId: number,
        scheduledAt: Date,
        durationMinutes: number
    ): Promise<AvailableTableResult> {
        const tables = await this.prisma.locationTables.findMany({
            where: {locationId},
            orderBy: {id: 'asc'}
        });

        if (!tables.length) {
            return {tableId: null, hasTables: false};
        }

        const start = scheduledAt.getTime();
        const end = start + durationMinutes * MINUTE_MS;
        const windowMs = MAX_BOOKING_DURATION_MINUTES * MINUTE_MS;
        const conflicts = await this.prisma.booking.findMany({
            where: {
                locationId,
                tableId: {not: null},
                status: {notIn: [BookingStatus.Cancelled, BookingStatus.Completed]},
                scheduledAt: {
                    gte: new Date(start - windowMs),
                    lt: new Date(end + windowMs)
                }
            },
            select: {tableId: true, scheduledAt: true, durationMinutes: true}
        });
        const freeTable = tables.find(
            table =>
                !conflicts.some(booking => {
                    if (booking.tableId !== table.id) return false;

                    const bookingStart = booking.scheduledAt.getTime();
                    const bookingEnd =
                        bookingStart + booking.durationMinutes * MINUTE_MS;

                    return bookingStart < end && start < bookingEnd;
                })
        );

        return {tableId: freeTable?.id ?? null, hasTables: true};
    }

    public async create(
        data: Prisma.BookingUncheckedCreateInput,
        action: CreateBookingAction
    ): Promise<Booking> {
        const booking = await this.prisma.$transaction(async tx => {
            const created = await tx.booking.create({data});

            await tx.bookingAction.create({
                data: {
                    bookingId: created.id,
                    type: BookingActionType.Created,
                    userExtId: action.userExtId,
                    comment: action.comment?.trim() || null
                }
            });

            return created;
        });

        this.logger.log(
            `Booking persisted: id=${booking.id}, locationId=${booking.locationId}, tableId=${booking.tableId ?? 'none'}`
        );

        return booking;
    }

    public async findBookingDetails(id: number): Promise<BookingWithDetails | null> {
        return this.prisma.booking.findUnique({
            where: {id},
            include: {
                location: {select: {name: true, orgId: true}},
                table: {select: {name: true}},
                actions: {orderBy: {createdAt: 'asc'}}
            }
        });
    }

    public async findUserNameByExtId(extId: string): Promise<string | null> {
        const user = await this.prisma.user.findFirst({
            where: {extId},
            select: {name: true}
        });

        return user?.name ?? null;
    }

    public async startBooking(
        id: number,
        seatedAt: Date,
        userExtId: string
    ): Promise<void> {
        await this.prisma.$transaction(async tx => {
            await tx.booking.update({
                where: {id},
                data: {seatedAt, status: BookingStatus.Confirmed}
            });

            await tx.bookingAction.create({
                data: {
                    bookingId: id,
                    type: BookingActionType.Started,
                    userExtId
                }
            });
        });
    }

    public async extendBooking(
        id: number,
        durationMinutes: number,
        addedMinutes: number,
        userExtId: string,
        comment?: string
    ): Promise<void> {
        await this.prisma.$transaction(async tx => {
            await tx.booking.update({
                where: {id},
                data: {durationMinutes}
            });

            await tx.bookingAction.create({
                data: {
                    bookingId: id,
                    type: BookingActionType.Extended,
                    userExtId,
                    minutes: addedMinutes,
                    comment: comment?.trim() || null
                }
            });
        });
    }

    public async closeBooking(
        id: number,
        data: {
            amount: number;
            completedAt: Date;
            seatedAt: Date;
            userExtId: string;
            comment?: string;
        }
    ): Promise<void> {
        await this.prisma.$transaction(async tx => {
            await tx.booking.update({
                where: {id},
                data: {
                    status: BookingStatus.Completed,
                    completedAt: data.completedAt,
                    seatedAt: data.seatedAt,
                    amount: data.amount
                }
            });

            await tx.bookingAction.create({
                data: {
                    bookingId: id,
                    type: BookingActionType.Closed,
                    userExtId: data.userExtId,
                    amount: data.amount,
                    comment: data.comment?.trim() || null
                }
            });
        });
    }

    public async cancelBooking(
        id: number,
        data: {userExtId: string; reason: string}
    ): Promise<void> {
        await this.prisma.$transaction(async tx => {
            await tx.booking.update({
                where: {id},
                data: {
                    status: BookingStatus.Cancelled,
                    completedAt: null
                }
            });

            await tx.bookingAction.create({
                data: {
                    bookingId: id,
                    type: BookingActionType.Cancelled,
                    userExtId: data.userExtId,
                    comment: data.reason.trim()
                }
            });
        });
    }
}
