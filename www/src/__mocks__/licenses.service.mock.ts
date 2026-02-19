import {LicensesService} from '@/licenses/licenses.service';

export const mockLicensesService: jest.Mocked<LicensesService> = {
    registrateLicense: jest.fn(),
    getExpiringLicenses: jest.fn()
} as any;
