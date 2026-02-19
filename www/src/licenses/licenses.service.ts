import {Inject, Injectable} from '@nestjs/common';
import {LICENSES_REPOSITORY, LicensesRepositoryInterface} from './licenses.repository';
import {LicenseWithOrg} from '@/types';

@Injectable()
export class LicensesService {
    public constructor(
        @Inject(LICENSES_REPOSITORY)
        private readonly licensesRepository: LicensesRepositoryInterface
    ) {}

    public getExpiringLicenses(): Promise<LicenseWithOrg[]> {
        return this.licensesRepository.findExpiringLicenses();
    }
}
