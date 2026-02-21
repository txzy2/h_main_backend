import {LicenseWithOrg} from '@/types';
import {Inject, Injectable} from '@nestjs/common';
import {Prisma} from '@prisma/client';
import {LICENSES_REPOSITORY, type LicensesRepositoryInterface} from './licenses.repository';
import {AppLoggerService} from '@/common/logger/logger.service';

@Injectable()
export class LicensesService {
    public constructor(
        @Inject(LICENSES_REPOSITORY)
        private readonly licensesRepository: LicensesRepositoryInterface,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(LicensesService.name);
    }

    /**
     * getExpiringLicenses - Поиск истекших лицензий
     *
     * @returns {Promise<LicenseWithOrg[]>}
     */
    public async getExpiringLicenses(): Promise<LicenseWithOrg[]> {
        this.logger.debug('Searching for expiring licenses');
        const licenses = await this.licensesRepository.findExpiringLicenses();
        this.logger.debug(`Expiring licenses found: count=${licenses.length}`);
        return licenses;
    }

    /**
     * registrateLicense - регистрация лицензии
     *
     * @param {number} orgId
     * @param {number} planId
     *
     * @returns {Promise<boolean>}
     */
    public async registrateLicense(
        orgId: number,
        planId: number,
        tx?: Prisma.TransactionClient
    ): Promise<boolean> {
        this.logger.log(`Registering license: orgId=${orgId}, planId=${planId}`);
        const result = await this.licensesRepository.register(orgId, planId, tx);
        this.logger.debug(
            `License registration result: orgId=${orgId}, planId=${planId}, result=${result}`
        );
        return result;
    }
}
