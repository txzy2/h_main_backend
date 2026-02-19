import {LicensesModule} from '@/licenses/licenses.module';
import {BullModule} from '@nestjs/bullmq';
import {Module} from '@nestjs/common';
import {LicensesJob} from './licenses.job';
import {LicensesScheduler} from './licenses.scheduler';

@Module({
    imports: [BullModule.registerQueue({name: 'licenses'}), LicensesModule],
    providers: [LicensesJob, LicensesScheduler]
})
export class LicensesJobModule {}
