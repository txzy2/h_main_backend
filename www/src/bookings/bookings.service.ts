import {Inject, Injectable} from '@nestjs/common';
import {BOOKINGS_REPOSITORY, type IBookingsRepository} from './bookings.repository';
import {AppLoggerService} from '@/common/logger/logger.service';
import {CreateBookingDto} from './dto/create-booking.dto';
import {AuthUser} from '@/types';

@Injectable()
export class BookingsService {
    public constructor(
        @Inject(BOOKINGS_REPOSITORY) private readonly repo: IBookingsRepository,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(BookingsService.name);
    }

    public async create(body: CreateBookingDto, user: AuthUser): Promise<string> {
        this.logger.debug('CREATE BOOKING');

        return 'OK';
    }
}
