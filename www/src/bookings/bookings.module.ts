import {Module} from '@nestjs/common';
import {BookingsController} from './bookings.controller';
import {BookingsService} from './bookings.service';
import {BOOKINGS_REPOSITORY, BookingsRepository} from './bookings.repository';

@Module({
    controllers: [BookingsController],
    providers: [
        BookingsService,
        {
            provide: BOOKINGS_REPOSITORY,
            useClass: BookingsRepository
        }
    ],
    exports: [BookingsService]
})
export class BookingsModule {}
