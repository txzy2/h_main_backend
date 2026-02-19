import {Processor, WorkerHost} from '@nestjs/bullmq';
import {Job} from 'bullmq';

import {LicensesService} from '@/licenses/licenses.service';
import {LicenseWithOrg} from '@/types';
import {AppLoggerService} from '@/common/logger/logger.service';

@Processor('licenses')
export class LicensesJob extends WorkerHost {
    public constructor(
        private readonly licensesService: LicensesService,
        private readonly logger: AppLoggerService
    ) {
        super();
    }

    public async process(job: Job): Promise<void> {
        this.logger.debug(`[LicensesJob] Получена задача: ${job.name} | id: ${job.id}`);

        switch (job.name) {
            case 'check_expiring':
                await this.checkExpiring();
                break;
            default:
                this.logger.warn(`[LicensesJob] Неизвестная задача: ${job.name}`);
        }
    }

    private async checkExpiring(): Promise<void> {
        this.logger.debug('[LicensesJob] Запуск проверки истекающих лицензий...');

        const expiringSoon: LicenseWithOrg[] = await this.licensesService.getExpiringLicenses();
        this.logger.debug(`[LicensesJob] Найдено истекающих лицензий: ${expiringSoon.length}`);

        if (expiringSoon.length === 0) {
            this.logger.debug('[LicensesJob] Истекающих лицензий не найдено, завершение задачи');
            return;
        }

        for (const license of expiringSoon) {
            this.logger.debug(
                `[LicensesJob] Организация: "${license.org.name}" | истекает: ${license.expiredAt.toISOString()}`
            );
            // TODO: отправить уведомление
        }

        this.logger.debug('[LicensesJob] Проверка завершена');
    }
}
