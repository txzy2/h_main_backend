import {Module} from '@nestjs/common';
import {PrismaModule} from '@/prisma/prisma.module';
import {DashboardController} from './dashboard.controller';
import {DASHBOARD_REPOSITORY, DashboardRepository} from './dashboard.repository';
import {DashboardService} from './dashboard.service';

@Module({
    imports: [PrismaModule],
    controllers: [DashboardController],
    providers: [
        DashboardService,
        {
            provide: DASHBOARD_REPOSITORY,
            useClass: DashboardRepository
        }
    ]
})
export class DashboardModule {}
