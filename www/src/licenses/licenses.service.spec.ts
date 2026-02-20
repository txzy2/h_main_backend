import {Test, TestingModule} from '@nestjs/testing';
import {LicensesService} from './licenses.service';
import {LICENSES_REPOSITORY} from './licenses.repository';
import {mockLicensesRepository} from '@/__mocks__/license.repository.mock';
import {mockExpiredLicnseDto} from '@/__mocks__';

describe('LicensesService', () => {
    let service: LicensesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LicensesService,
                {provide: LICENSES_REPOSITORY, useValue: mockLicensesRepository}
            ]
        }).compile();

        service = module.get<LicensesService>(LicensesService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('registrateLicense', () => {
        it('возвращает true при успешной регистрации', async () => {
            mockLicensesRepository.register.mockResolvedValue(true);
            const result = await service.registrateLicense(1, 1);
            expect(result).toBe(true);
            expect(mockLicensesRepository.register).toHaveBeenCalledWith(1, 1, undefined);
        });

        it('передаёт tx в репозиторий', async () => {
            const tx = {} as any;
            mockLicensesRepository.register.mockResolvedValue(true);
            await service.registrateLicense(1, 1, tx);
            expect(mockLicensesRepository.register).toHaveBeenCalledWith(1, 1, tx);
        });
    });

    describe('getExpiringLicenses', () => {
        it('возвращает список истекающих лицензий', async () => {
            mockLicensesRepository.findExpiringLicenses.mockResolvedValue(mockExpiredLicnseDto);
            const result = await service.getExpiringLicenses();
            expect(result).toEqual(mockExpiredLicnseDto);
        });

        it('возвращает пустой массив если лицензий нет', async () => {
            mockLicensesRepository.findExpiringLicenses.mockResolvedValue([]);
            const result = await service.getExpiringLicenses();
            expect(result).toHaveLength(0);
        });
    });
});
