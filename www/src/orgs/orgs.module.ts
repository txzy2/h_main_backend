import {LicensesModule} from '@/licenses/licenses.module';
import {PLANS_REPOSITORY, PlansRepository} from '@/plans/plans.repository';
import {PrismaService} from '@/prisma/prisma.service';
import {UserModule} from '@/user/user.module';
import {Module} from '@nestjs/common';
import {OrgsController} from './orgs.controller';
import {ORGS_REPOSITORY, OrgsRepository} from './orgs.repository';
import {OrgsService} from './orgs.service';

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
