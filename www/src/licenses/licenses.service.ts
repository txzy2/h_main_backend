import {LicenseWithOrg} from '@/types';
import {Inject, Injectable} from '@nestjs/common';
import {Prisma} from '@prisma/client';
import {LICENSES_REPOSITORY, LicensesRepositoryInterface} from './licenses.repository';

@Injectable()
export class LicensesService {
    public constructor(
        @Inject(LICENSES_REPOSITORY)
        private readonly licensesRepository: LicensesRepositoryInterface
    ) {}

    /**
     * getExpiringLicenses - Поиск истекших лицензий
     *
     * @returns {Promise<LicenseWithOrg[]>}
     */
    public async getExpiringLicenses(): Promise<LicenseWithOrg[]> {
        return await this.licensesRepository.findExpiringLicenses();
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
        return await this.licensesRepository.register(orgId, planId, tx);
    }
}
