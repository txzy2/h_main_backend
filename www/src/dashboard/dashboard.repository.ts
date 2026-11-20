import {Injectable} from '@nestjs/common';
import {Activity, BookingStatus, Organization, Prisma, User} from '@prisma/client';
import {AppLoggerService} from '@/common/logger/logger.service';
import {PrismaService} from '@/prisma/prisma.service';
import {
    DashboardBooking,
    DashboardLocation,
    DashboardShift,
    DashboardUser,
    TeamUser
} from './dashboard.types';

export const DASHBOARD_REPOSITORY = Symbol('DASHBOARD_REPOSITORY');

export type UserWithOrganization = User & {org: Organization};

const BOOKING_SELECT = {
    id: true,
    locationId: true,
    tableId: true,
    userExtId: true,
    guestName: true,
    guestPhone: true,
    guestsCount: true,
    status: true,
    scheduledAt: true,
    durationMinutes: true,
    seatedAt: true,
    completedAt: true,
    amount: true,
    rating: true,
    updatedAt: true,
    location: {select: {name: true}},
    table: {select: {name: true}}
} satisfies Prisma.BookingSelect;

type BookingRow = Prisma.BookingGetPayload<{select: typeof BOOKING_SELECT}>;

function toDashboardBooking(row: BookingRow): DashboardBooking {
    const {location, table, ...booking} = row;

    return {
        ...booking,
        locationName: location.name,
        tableName: table?.name ?? null
    };
}

export interface DashboardRepositoryInterface {
    findUserWithOrg(extId: string): Promise<UserWithOrganization | null>;

    findBookings(orgId: number, from: Date, to: Date): Promise<DashboardBooking[]>;

    findCompletedByUser(
        orgId: number,
        userExtId: string,
        from: Date,
        to: Date
    ): Promise<DashboardBooking[]>;

    findCompleted(orgId: number, from: Date, to: Date): Promise<DashboardBooking[]>;

    findLocations(orgId: number): Promise<DashboardLocation[]>;

    findUsers(orgId: number): Promise<DashboardUser[]>;

    findTeamUsers(orgId: number): Promise<TeamUser[]>;

    findShifts(orgId: number, from: Date, to: Date): Promise<DashboardShift[]>;

    findShiftCacheVersion(orgId: number, userId: number): Promise<string>;

    startShift(shiftId: number, startedAt: Date): Promise<void>;

    finishShift(shiftId: number, endedAt: Date): Promise<void>;

    createShift(data: {
        userId: number;
        orgId: number;
        startsAt: Date;
        endsAt: Date | null;
        bookingsGoal: number;
        actualStartedAt: Date;
    }): Promise<void>;

    findGuestFirstVisits(orgId: number, guestPhones: string[]): Promise<Map<string, Date>>;
}

@Injectable()
export class DashboardRepository implements DashboardRepositoryInterface {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(DashboardRepository.name);
    }

    public async findUserWithOrg(extId: string): Promise<UserWithOrganization | null> {
        return this.prisma.user.findFirst({
            where: {extId},
            include: {org: true}
        });
    }

    public async findBookings(orgId: number, from: Date, to: Date): Promise<DashboardBooking[]> {
        const rows = await this.prisma.booking.findMany({
            where: {
                location: {orgId},
                scheduledAt: {gte: from, lt: to}
            },
            select: BOOKING_SELECT,
            orderBy: {scheduledAt: 'asc'}
        });

        this.logger.debug(`Bookings fetched: orgId=${orgId}, count=${rows.length}`);

        return rows.map(toDashboardBooking);
    }

    public async findCompletedByUser(
        orgId: number,
        userExtId: string,
        from: Date,
        to: Date
    ): Promise<DashboardBooking[]> {
        const rows = await this.prisma.booking.findMany({
            where: {
                location: {orgId},
                userExtId,
                completedAt: {gte: from, lt: to}
            },
            select: BOOKING_SELECT,
            orderBy: {completedAt: 'asc'}
        });

        this.logger.debug(
            `Completed bookings fetched: orgId=${orgId}, user=${userExtId}, count=${rows.length}`
        );

        return rows.map(toDashboardBooking);
    }

    public async findCompleted(
        orgId: number,
        from: Date,
        to: Date
    ): Promise<DashboardBooking[]> {
        const rows = await this.prisma.booking.findMany({
            where: {
                location: {orgId},
                completedAt: {gte: from, lt: to}
            },
            select: BOOKING_SELECT,
            orderBy: {completedAt: 'asc'}
        });

        this.logger.debug(
            `Completed bookings fetched: orgId=${orgId}, count=${rows.length}`
        );

        return rows.map(toDashboardBooking);
    }

    public async findLocations(orgId: number): Promise<DashboardLocation[]> {
        const locations = await this.prisma.location.findMany({
            where: {orgId, status: Activity.Active},
            select: {
                id: true,
                name: true,
                address: true,
                activePlaces: true,
                _count: {select: {locationTables: true}}
            },
            orderBy: {id: 'asc'}
        });

        return locations.map(location => ({
            id: location.id,
            name: location.name,
            address: location.address,
            activePlaces: location.activePlaces,
            tablesCount: location._count.locationTables || location.activePlaces
        }));
    }

    public async findUsers(orgId: number): Promise<DashboardUser[]> {
        return this.prisma.user.findMany({
            where: {orgId},
            select: {extId: true, name: true, position: true},
            orderBy: {id: 'asc'}
        });
    }

    public async findTeamUsers(orgId: number): Promise<TeamUser[]> {
        const users = await this.prisma.user.findMany({
            where: {orgId},
            select: {
                id: true,
                extId: true,
                login: true,
                name: true,
                phoneNumber: true,
                position: true,
                createdAt: true
            },
            orderBy: {name: 'asc'}
        });

        return users.map(user => ({
            id: user.id,
            extId: user.extId,
            login: user.login,
            name: user.name,
            phone: user.phoneNumber,
            position: user.position,
            createdAt: user.createdAt
        }));
    }

    public async findShifts(orgId: number, from: Date, to: Date): Promise<DashboardShift[]> {
        const shifts = await this.prisma.shift.findMany({
            where: {
                orgId,
                startsAt: {lt: to},
                OR: [{endsAt: null}, {endsAt: {gt: from}}]
            },
            select: {
                id: true,
                userId: true,
                startsAt: true,
                endsAt: true,
                bookingsGoal: true,
                actualStartedAt: true,
                actualEndedAt: true,
                user: {select: {extId: true, name: true, position: true}}
            },
            orderBy: {startsAt: 'asc'}
        });

        return shifts.map(shift => ({
            id: shift.id,
            userId: shift.userId,
            userExtId: shift.user.extId,
            userName: shift.user.name,
            userPosition: shift.user.position,
            startsAt: shift.startsAt,
            endsAt: shift.endsAt,
            bookingsGoal: shift.bookingsGoal,
            actualStartedAt: shift.actualStartedAt,
            actualEndedAt: shift.actualEndedAt
        }));
    }

    /**
     * Версия кэша смены пользователя. Меняется при старте/завершении смены,
     * поэтому старый параллельный GET не сможет перезаписать свежий кэш.
     */
    public async findShiftCacheVersion(orgId: number, userId: number): Promise<string> {
        const [shiftResult, bookingResult] = await Promise.all([
            this.prisma.shift.aggregate({
                where: {orgId, userId},
                _max: {updatedAt: true}
            }),
            this.prisma.booking.aggregate({
                where: {location: {orgId}},
                _max: {updatedAt: true}
            })
        ]);
        const shiftVersion = shiftResult._max.updatedAt?.toISOString() ?? 'none';
        const bookingVersion = bookingResult._max.updatedAt?.toISOString() ?? 'none';

        // Версия меняется и при изменении смены, и при любой брони организации.
        return `${shiftVersion}:${bookingVersion}`;
    }

    public async startShift(shiftId: number, startedAt: Date): Promise<void> {
        await this.prisma.shift.update({
            where: {id: shiftId},
            data: {actualStartedAt: startedAt}
        });
    }

    public async finishShift(shiftId: number, endedAt: Date): Promise<void> {
        await this.prisma.shift.update({
            where: {id: shiftId},
            data: {actualEndedAt: endedAt}
        });
    }

    public async createShift(data: {
        userId: number;
        orgId: number;
        startsAt: Date;
        endsAt: Date | null;
        bookingsGoal: number;
        actualStartedAt: Date;
    }): Promise<void> {
        await this.prisma.shift.create({
            data: {
                userId: data.userId,
                orgId: data.orgId,
                startsAt: data.startsAt,
                endsAt: data.endsAt,
                bookingsGoal: data.bookingsGoal,
                actualStartedAt: data.actualStartedAt
            }
        });
    }

    /**
     * Первый визит гостя по всей истории организации — нужен, чтобы гость,
     * приходивший больше 120 дней назад, не считался новым.
     */
    public async findGuestFirstVisits(
        orgId: number,
        guestPhones: string[]
    ): Promise<Map<string, Date>> {
        if (!guestPhones.length) return new Map();

        const rows = await this.prisma.booking.groupBy({
            by: ['guestPhone'],
            where: {
                location: {orgId},
                guestPhone: {in: guestPhones},
                status: {not: BookingStatus.Cancelled}
            },
            _min: {scheduledAt: true}
        });
        const firstVisits = new Map<string, Date>();

        for (const row of rows) {
            if (row.guestPhone && row._min.scheduledAt) {
                firstVisits.set(row.guestPhone, row._min.scheduledAt);
            }
        }

        return firstVisits;
    }
}
