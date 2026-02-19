import {LicensesRepositoryInterface} from '@/licenses/licenses.repository';

export const mockLicensesRepository: jest.Mocked<LicensesRepositoryInterface> = {
    register: jest.fn(),
    findExpiringLicenses: jest.fn()
};
