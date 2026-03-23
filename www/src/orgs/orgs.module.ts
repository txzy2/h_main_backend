import {LicensesModule} from '@/licenses/licenses.module';
import {PrismaService} from '@/prisma/prisma.service';
import {UserModule} from '@/user/user.module';
import {forwardRef, Module} from '@nestjs/common';
import {OrgsController} from './orgs.controller';
import {PlansModule} from '@/plans/plans.module';
import {CreateOrgUseCase} from './use-cases/create-org.use-case';
import {OrgsService} from './orgs.service';
import {ORGS_REPOSITORY, OrgsRepository} from './orgs.repository';
import {UpdateOrgUseCase} from './use-cases/update-org.use-case';
import {TicketsModule} from '@/tickets/tickets.module';
import {CommonHttpModule} from '@/common/http/http.module';
import {BullModule} from '@nestjs/bullmq';

@Module({
    imports: [
        UserModule,
        LicensesModule,
        PlansModule,
        CommonHttpModule,
        BullModule.registerQueue({name: 'update-org'}),
        forwardRef(() => TicketsModule)
    ],
    controllers: [OrgsController],
    providers: [
        OrgsService,
        PrismaService,
        {
            provide: ORGS_REPOSITORY,
            useClass: OrgsRepository
        },
        CreateOrgUseCase,
        UpdateOrgUseCase
    ],
    exports: [OrgsService]
})
export class OrgsModule {}
