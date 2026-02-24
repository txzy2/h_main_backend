import {LicensesModule} from '@/licenses/licenses.module';
import {PrismaService} from '@/infrastructure/prisma/prisma.service';
import {UserModule} from '@/user/user.module';
import {Module} from '@nestjs/common';
import {OrgsController} from './orgs.controller';
import {PlansModule} from '@/plans/plans.module';
import {CreateOrgUseCase} from './use-cases/create-org.use-case';
import {OrgsService} from './orgs.service';
import {ORGS_REPOSITORY, OrgsRepository} from './orgs.repository';

@Module({
    imports: [UserModule, LicensesModule, PlansModule],
    controllers: [OrgsController],
    providers: [
        OrgsService,
        PrismaService,
        {
            provide: ORGS_REPOSITORY,
            useClass: OrgsRepository
        },
        CreateOrgUseCase
    ],
    exports: [OrgsService]
})
export class OrgsModule {}
