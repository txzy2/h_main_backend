import {Module} from '@nestjs/common';
import {BookingsController} from './bookings.controller';
import {BookingsService} from './bookings.service';
import {BOOKINGS_REPOSITORY, BookingsRepository} from './bookings.repository';
import {CreateBookingUseCase} from './use-cases/create-booking.use-case';
import {PrismaModule} from '@/prisma/prisma.module';
import {OrgsModule} from '@/orgs/orgs.module';

@Module({
    imports: [PrismaModule, OrgsModule],
    controllers: [BookingsController],
    providers: [
        BookingsService,
        {
            provide: BOOKINGS_REPOSITORY,
            useClass: BookingsRepository
        },
        CreateBookingUseCase
    ],
    exports: [BookingsService]
})
export class BookingsModule {}
