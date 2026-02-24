import {Module} from '@nestjs/common';
import {LocationsService} from './locations.service';
import {LocationsController} from './locations.controller';
import {LOCATIONS_REPOSITORY, LocationsRepository} from './locations.repository';
import {UserModule} from '@/user/user.module';
import {OrgsModule} from '@/orgs/orgs.module';
import {PrismaService} from '@/infrastructure/prisma/prisma.service';

@Module({
    imports: [UserModule, OrgsModule],
    controllers: [LocationsController],
    providers: [
        LocationsService,
        PrismaService,
        {provide: LOCATIONS_REPOSITORY, useClass: LocationsRepository}
    ]
})
export class LocationsModule {}
