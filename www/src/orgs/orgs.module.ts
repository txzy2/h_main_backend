import {LicensesModule} from '@/licenses/licenses.module';
import {PrismaService} from '@/prisma/prisma.service';
import {UserModule} from '@/user/user.module';
import {Module} from '@nestjs/common';
import {OrgsController} from './orgs.controller';
import {ORGS_REPOSITORY, OrgsRepository} from './orgs.repository';
import {OrgsService} from './orgs.service';
import {PlansModule} from '@/plans/plans.module';

@Module({
    imports: [UserModule, LicensesModule, PlansModule],
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
