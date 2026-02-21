import {InjectQueue} from '@nestjs/bullmq';
import {Injectable} from '@nestjs/common';
import {Cron} from '@nestjs/schedule';
import {Queue} from 'bullmq';

@Injectable()
export class LicensesScheduler {
    public constructor(@InjectQueue('licenses') private readonly licensesQueue: Queue) {}

    // каждый день в 9:00
    // @Cron(CronExpression.EVERY_DAY_AT_10PM)
    @Cron('07 20 * * *')
    async checkExpiringLicenses(): Promise<void> {
        await this.licensesQueue.add('check_expiring', {});
    }
}
