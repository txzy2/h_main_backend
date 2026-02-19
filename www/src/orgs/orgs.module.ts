import {Module} from '@nestjs/common';
import {OrgsService} from './orgs.service';
import {OrgsController} from './orgs.controller';
import {ORGS_REPOSITORY, OrgsRepository} from './orgs.repository';
import {PrismaService} from '@/prisma/prisma.service';

@Module({
    controllers: [OrgsController],
    providers: [
        OrgsService,
        PrismaService,
        {
            provide: ORGS_REPOSITORY,
            useClass: OrgsRepository
        }
    ]
})
export class OrgsModule {}
