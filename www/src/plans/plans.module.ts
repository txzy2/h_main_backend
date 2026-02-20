import {Module} from '@nestjs/common';
import {PlansService} from './plans.service';
import {PrismaService} from '@/prisma/prisma.service';
import {PlansController} from './plans.controller';
import {PLANS_REPOSITORY, PlansRepository} from './plans.repository';

@Module({
    controllers: [PlansController],
    providers: [
        PlansService,
        PrismaService,
        {provide: PLANS_REPOSITORY, useClass: PlansRepository}
    ],
    exports: [PlansService]
})
export class PlansModule {}
