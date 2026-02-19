// orgs.service.spec.ts
import {Test, TestingModule} from '@nestjs/testing';
import {ConflictException} from '@nestjs/common';
import {OrgsService} from './orgs.service';
import {ORGS_REPOSITORY} from './orgs.repository';
import {PLANS_REPOSITORY} from '@/plans/plans.repository';
import {LicensesService} from '@/licenses/licenses.service';
import {UserService} from '@/user/user.service';
import {PrismaService} from '@/prisma/prisma.service';
import {AppLoggerService} from '@/common/logger/logger.service';
import {
    mockAuthUser,
    mockCreateOrgDto,
    mockLoggerService,
    mockOrganization,
    mockOrgsRepository,
    mockPlan,
    mockPlansRepository,
    mockPrismaService
} from '@/__mocks__';
import {mockLicensesService} from '@/__mocks__/licenses.service.mock';
import {mockUserService} from '@/__mocks__/user.service.mock';

describe('OrgsService', () => {
    let service: OrgsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrgsService,
                {provide: ORGS_REPOSITORY, useValue: mockOrgsRepository},
                {provide: PLANS_REPOSITORY, useValue: mockPlansRepository},
                {provide: LicensesService, useValue: mockLicensesService},
                {provide: UserService, useValue: mockUserService},
                {provide: PrismaService, useValue: mockPrismaService},
                {provide: AppLoggerService, useValue: mockLoggerService}
            ]
        }).compile();

        service = module.get<OrgsService>(OrgsService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('create', () => {
        it('успешно создаёт организацию', async () => {
            mockOrgsRepository.checkExistByParams.mockResolvedValue(null);
            mockPlansRepository.findByName.mockResolvedValue(mockPlan);
            mockOrgsRepository.create.mockResolvedValue(mockOrganization);
            mockLicensesService.registrateLicense.mockResolvedValue(true);
            mockUserService.createUser.mockResolvedValue(undefined);

            const result = await service.create(mockCreateOrgDto as any, mockAuthUser as any);

            expect(result).toEqual(mockOrganization);
            expect(mockOrgsRepository.create).toHaveBeenCalledTimes(1);
            expect(mockLicensesService.registrateLicense).toHaveBeenCalledWith(
                mockOrganization.id,
                mockPlan.id,
                {}
            );
            expect(mockUserService.createUser).toHaveBeenCalledTimes(1);
        });

        it('бросает ConflictException если организация уже существует', async () => {
            mockOrgsRepository.checkExistByParams.mockResolvedValue(mockOrganization);

            await expect(
                service.create(mockCreateOrgDto as any, mockAuthUser as any)
            ).rejects.toThrow(ConflictException);

            expect(mockOrgsRepository.create).not.toHaveBeenCalled();
        });

        it('бросает ConflictException если план не найден', async () => {
            mockOrgsRepository.checkExistByParams.mockResolvedValue(null);
            mockPlansRepository.findByName.mockResolvedValue(null);

            await expect(
                service.create(mockCreateOrgDto as any, mockAuthUser as any)
            ).rejects.toThrow(ConflictException);

            expect(mockOrgsRepository.create).not.toHaveBeenCalled();
        });

        it('откатывает транзакцию если registrateLicense упал', async () => {
            mockOrgsRepository.checkExistByParams.mockResolvedValue(null);
            mockPlansRepository.findByName.mockResolvedValue(mockPlan);
            mockOrgsRepository.create.mockResolvedValue(mockOrganization);
            mockLicensesService.registrateLicense.mockRejectedValue(new Error('DB error'));

            await expect(
                service.create(mockCreateOrgDto as any, mockAuthUser as any)
            ).rejects.toThrow('DB error');
        });

        it('откатывает транзакцию если createUser упал', async () => {
            mockOrgsRepository.checkExistByParams.mockResolvedValue(null);
            mockPlansRepository.findByName.mockResolvedValue(mockPlan);
            mockOrgsRepository.create.mockResolvedValue(mockOrganization);
            mockLicensesService.registrateLicense.mockResolvedValue(true);
            mockUserService.createUser.mockRejectedValue(new Error('User error'));

            await expect(
                service.create(mockCreateOrgDto as any, mockAuthUser as any)
            ).rejects.toThrow('User error');
        });
    });
});
