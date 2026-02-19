import {Inject, Injectable} from '@nestjs/common';
import {LICENSES_REPOSITORY, LicensesRepositoryInterface} from './licenses.repository';
import {LicenseWithOrg} from '@/types';
import {Prisma} from '@prisma/client';

@Injectable()
export class LicensesService {
    public constructor(
        @Inject(LICENSES_REPOSITORY)
        private readonly licensesRepository: LicensesRepositoryInterface
    ) {}

    public getExpiringLicenses(): Promise<LicenseWithOrg[]> {
        return this.licensesRepository.findExpiringLicenses();
    }

    public async registrateLicense(
        orgId: number,
        planId: number,
        tx?: Prisma.TransactionClient
    ): Promise<boolean> {
        return this.licensesRepository.register(orgId, planId, tx);
    }
}
