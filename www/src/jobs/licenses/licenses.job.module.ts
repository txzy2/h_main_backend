import {Module} from '@nestjs/common';
import {BullModule} from '@nestjs/bullmq';
import {LicensesJob} from './licenses.job';
import {LicensesScheduler} from './licenses.scheduler';
import {LicensesModule} from '@/licenses/licenses.module';

@Module({
    imports: [BullModule.registerQueue({name: 'licenses'}), LicensesModule],
    providers: [LicensesJob, LicensesScheduler]
})
export class LicensesJobModule {}
