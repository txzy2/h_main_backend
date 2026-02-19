import {Module} from '@nestjs/common';
import {OrgsService} from './orgs.service';
import {OrgsController} from './orgs.controller';
import {ORGS_REPOSITORY, OrgsRepository} from './orgs.repository';
import {PrismaService} from '@/prisma/prisma.service';
import {PLANS_REPOSITORY, PlansRepository} from '@/plans/plans.repository';
import {UserModule} from '@/user/user.module';
import {LicensesModule} from '@/licenses/licenses.module';

@Module({
    imports: [UserModule, LicensesModule],
    controllers: [OrgsController],
    providers: [
        OrgsService,
        PrismaService,
        {
            provide: ORGS_REPOSITORY,
            useClass: OrgsRepository
        },
        {
            provide: PLANS_REPOSITORY,
            useClass: PlansRepository
        }
    ]
})
export class OrgsModule {}
