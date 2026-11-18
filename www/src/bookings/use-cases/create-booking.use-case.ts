import {BadRequestException, Injectable} from '@nestjs/common';
import {Booking} from '@prisma/client';
import {ApiErrors} from '@/common/errors/api-errors';
import {AppLoggerService} from '@/common/logger/logger.service';
import {OrgsService} from '@/orgs/orgs.service';
import {AuthUser} from '@/types';
import {BookingsService} from '../bookings.service';
import {CreateBookingDto} from '../dto/create-booking.dto';

const PAST_GRACE_MS = 5 * 60 * 1000;

@Injectable()
export class CreateBookingUseCase {
    public constructor(
        private readonly bookingsService: BookingsService,
        private readonly orgService: OrgsService,
        private readonly logger: AppLoggerService
    ) {}

    public async execute(body: CreateBookingDto, user: AuthUser): Promise<Booking> {
        const scheduledAt = new Date(body.scheduledAt);

        if (Number.isNaN(scheduledAt.getTime())) {
            throw new BadRequestException(ApiErrors.INVALID_BOOKING_TIMESTAMP);
        }

        if (scheduledAt.getTime() < Date.now() - PAST_GRACE_MS) {
            throw new BadRequestException(ApiErrors.BOOKING_TIME_IN_PAST);
        }

        await this.orgService.ensureUserBelongsToOrgOrThrow(user.sub, body.orgId);

        this.logger.debug(
            `Create booking: user=${user.sub}, orgId=${body.orgId}, locationId=${body.locationId}`
        );

        return this.bookingsService.create(body, user.sub);
    }
}
