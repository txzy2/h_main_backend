import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException
} from '@nestjs/common';
import {Booking, BookingStatus} from '@prisma/client';
import {ApiErrors} from '@/common/errors/api-errors';
import {AppLoggerService} from '@/common/logger/logger.service';
import {OrgsService} from '@/orgs/orgs.service';
import {AuthUser} from '@/types';
import {
    BOOKINGS_REPOSITORY,
    DEFAULT_BOOKING_DURATION_MINUTES,
    MAX_BOOKING_DURATION_MINUTES,
    type BookingWithDetails,
    type IBookingsRepository
} from './bookings.repository';
import {BookingDetailsDto} from './bookings.types';
import {CancelBookingDto} from './dto/cancel-booking.dto';
import {CloseBookingDto} from './dto/close-booking.dto';
import {CreateBookingDto} from './dto/create-booking.dto';
import {ExtendBookingDto} from './dto/extend-booking.dto';

const MINUTE_MS = 60 * 1000;

@Injectable()
export class BookingsService {
    public constructor(
        @Inject(BOOKINGS_REPOSITORY) private readonly repository: IBookingsRepository,
        private readonly orgsService: OrgsService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(BookingsService.name);
    }

    public async create(body: CreateBookingDto, userExtId: string): Promise<Booking> {
        const scheduledAt = new Date(body.scheduledAt);
        const location = await this.repository.findActiveLocation(body.locationId, body.orgId);

        if (!location) {
            throw new ConflictException(ApiErrors.BOOKING_LOCATION_NOT_FOUND);
        }

        const durationMinutes = DEFAULT_BOOKING_DURATION_MINUTES;
        let tableId: number | null = body.tableId ?? null;

        if (tableId !== null) {
            const table = await this.repository.findTable(tableId, location.id);

            if (!table) {
                throw new ConflictException(ApiErrors.BOOKING_TABLE_NOT_FOUND);
            }

            if (
                !(await this.repository.isTableAvailable(
                    tableId,
                    scheduledAt,
                    durationMinutes
                ))
            ) {
                throw new ConflictException(ApiErrors.BOOKING_TABLE_BUSY);
            }
        } else {
            const available = await this.repository.pickAvailableTable(
                location.id,
                scheduledAt,
                durationMinutes
            );

            if (available.hasTables && available.tableId === null) {
                throw new ConflictException(ApiErrors.BOOKING_NO_FREE_TABLE);
            }

            tableId = available.tableId;
        }

        const booking = await this.repository.create(
            {
                locationId: location.id,
                tableId,
                userExtId,
                guestName: body.guestName.trim(),
                guestPhone: body.guestPhone.trim(),
                guestsCount: body.guestsCount,
                status: BookingStatus.Confirmed,
                scheduledAt,
                durationMinutes,
                seatedAt: null,
                completedAt: null,
                amount: 0,
                rating: null,
                comment: body.comment?.trim() || null
            },
            {userExtId, comment: body.comment}
        );

        this.logger.log(
            `Booking created: id=${booking.id}, orgId=${body.orgId}, locationId=${location.id}, scheduledAt=${scheduledAt.toISOString()}`
        );

        return booking;
    }

    public async getDetails(id: number, user: AuthUser): Promise<BookingDetailsDto> {
        const booking = await this.loadBooking(id);

        await this.orgsService.ensureUserBelongsToOrgOrThrow(
            user.sub,
            booking.location.orgId
        );

        return this.toDetails(booking, user.sub);
    }

    public async start(id: number, user: AuthUser): Promise<BookingDetailsDto> {
        const booking = await this.loadOwnedBooking(id, user);
        this.ensureMutable(booking);

        if (booking.seatedAt) {
            throw new ConflictException(ApiErrors.BOOKING_ALREADY_STARTED);
        }

        await this.repository.startBooking(booking.id, new Date(), user.sub);

        this.logger.log(`Booking started: id=${booking.id}`);

        return this.getDetails(id, user);
    }

    public async extend(
        id: number,
        body: ExtendBookingDto,
        user: AuthUser
    ): Promise<BookingDetailsDto> {
        const booking = await this.loadOwnedBooking(id, user);
        this.ensureMutable(booking);

        const durationMinutes = booking.durationMinutes + body.minutes;

        if (durationMinutes > MAX_BOOKING_DURATION_MINUTES) {
            throw new BadRequestException(ApiErrors.BOOKING_EXTEND_LIMIT);
        }

        if (
            booking.tableId &&
            !(await this.repository.isTableAvailable(
                booking.tableId,
                booking.scheduledAt,
                durationMinutes,
                booking.id
            ))
        ) {
            throw new ConflictException(ApiErrors.BOOKING_TABLE_BUSY);
        }

        await this.repository.extendBooking(
            booking.id,
            durationMinutes,
            body.minutes,
            user.sub,
            body.comment
        );

        this.logger.log(`Booking extended: id=${booking.id}, +${body.minutes}min`);

        return this.getDetails(id, user);
    }

    public async close(
        id: number,
        body: CloseBookingDto,
        user: AuthUser
    ): Promise<BookingDetailsDto> {
        const booking = await this.loadOwnedBooking(id, user);
        this.ensureMutable(booking);

        const amount = body.amount ?? booking.amount;
        const completedAt = new Date();
        const seatedAt = booking.seatedAt ?? booking.scheduledAt;

        await this.repository.closeBooking(booking.id, {
            amount,
            completedAt,
            seatedAt,
            userExtId: user.sub,
            comment: body.comment
        });

        this.logger.log(`Booking closed: id=${booking.id}, amount=${amount}`);

        return this.getDetails(id, user);
    }

    public async cancel(
        id: number,
        body: CancelBookingDto,
        user: AuthUser
    ): Promise<BookingDetailsDto> {
        const booking = await this.loadOwnedBooking(id, user);
        this.ensureMutable(booking);

        await this.repository.cancelBooking(booking.id, {
            userExtId: user.sub,
            reason: body.reason
        });

        this.logger.log(`Booking cancelled: id=${booking.id}, reason=${body.reason}`);

        return this.getDetails(id, user);
    }

    private async loadBooking(id: number): Promise<BookingWithDetails> {
        const booking = await this.repository.findBookingDetails(id);

        if (!booking) {
            throw new NotFoundException(ApiErrors.BOOKING_NOT_FOUND);
        }

        return booking;
    }

    private async loadOwnedBooking(
        id: number,
        user: AuthUser
    ): Promise<BookingWithDetails> {
        const booking = await this.loadBooking(id);

        await this.orgsService.ensureUserBelongsToOrgOrThrow(
            user.sub,
            booking.location.orgId
        );

        if (booking.userExtId !== user.sub) {
            throw new ForbiddenException(ApiErrors.BOOKING_NOT_OWNED);
        }

        return booking;
    }

    private ensureMutable(booking: BookingWithDetails): void {
        if (booking.status === BookingStatus.Completed) {
            throw new ConflictException(ApiErrors.BOOKING_ALREADY_CLOSED);
        }
        if (booking.status === BookingStatus.Cancelled) {
            throw new ConflictException(ApiErrors.BOOKING_ALREADY_CANCELLED);
        }
    }

    private async toDetails(
        booking: BookingWithDetails,
        userExtId: string
    ): Promise<BookingDetailsDto> {
        const createdByName = await this.repository.findUserNameByExtId(booking.userExtId);
        const expectedEndAt = new Date(
            booking.scheduledAt.getTime() + booking.durationMinutes * MINUTE_MS
        );

        return {
            id: booking.id,
            locationId: booking.locationId,
            locationName: booking.location.name,
            tableId: booking.tableId,
            tableName: booking.table?.name ?? null,
            guestName: booking.guestName,
            guestPhone: booking.guestPhone,
            guestsCount: booking.guestsCount,
            status: booking.status,
            scheduledAt: booking.scheduledAt.toISOString(),
            durationMinutes: booking.durationMinutes,
            expectedEndAt: expectedEndAt.toISOString(),
            seatedAt: booking.seatedAt?.toISOString() ?? null,
            completedAt: booking.completedAt?.toISOString() ?? null,
            amount: booking.amount,
            rating: booking.rating,
            comment: booking.comment,
            userExtId: booking.userExtId,
            createdByName,
            isMine: booking.userExtId === userExtId,
            createdAt: booking.createdAt.toISOString(),
            actions: booking.actions.map(action => ({
                id: action.id,
                type: action.type,
                minutes: action.minutes,
                amount: action.amount,
                comment: action.comment,
                createdAt: action.createdAt.toISOString()
            }))
        };
    }
}
