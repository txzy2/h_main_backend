import {OrgsModule} from '@/orgs/orgs.module';
import {BullModule} from '@nestjs/bullmq';
import {Module} from '@nestjs/common';
import {JobsOptions} from 'bullmq';
import {UpdateOrgJob} from './update-org.job';

const DEFAULT_JOB_OPTIONS: JobsOptions = {
    attempts: 5,
    backoff: {
        type: 'exponential',
        delay: 3000
    },
    removeOnComplete: true
};

@Module({
    imports: [
        BullModule.registerQueue({name: 'orgs', defaultJobOptions: DEFAULT_JOB_OPTIONS}),
        OrgsModule
    ],
    providers: [UpdateOrgJob]
})
export class OrgsJobModule {}
