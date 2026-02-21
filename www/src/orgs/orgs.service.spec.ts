// orgs.service.spec.ts
import {Test, TestingModule} from '@nestjs/testing';
import {ConflictException, InternalServerErrorException} from '@nestjs/common';
import {OrgsService} from './orgs.service';
import {ORGS_REPOSITORY} from './orgs.repository';
import {LicensesService} from '@/licenses/licenses.service';
import {UserService} from '@/user/user.service';
import {PrismaService} from '@/prisma/prisma.service';
import {AppLoggerService} from '@/common/logger/logger.service';
import {
    mockAuthUser,
    mockCreateLocationDto,
    mockCreateOrgDto,
    mockLoggerService,
    mockOrganization,
    mockOrgsRepository,
    mockPlan,
    mockPrismaService
} from '@/__mocks__';
import {mockLicensesService} from '@/__mocks__/licenses.service.mock';
import {mockUserService} from '@/__mocks__/user.service.mock';
import {PlansService} from '@/plans/plans.service';
import {mockPlansService} from '@/__mocks__/plans.service.mock';

describe('OrgsService', () => {
    let service: OrgsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrgsService,
                {provide: ORGS_REPOSITORY, useValue: mockOrgsRepository},
                {provide: LicensesService, useValue: mockLicensesService},
                {provide: UserService, useValue: mockUserService},
                {provide: PrismaService, useValue: mockPrismaService},
                {provide: PlansService, useValue: mockPlansService},
                {provide: AppLoggerService, useValue: mockLoggerService}
            ]
        }).compile();

        service = module.get<OrgsService>(OrgsService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('create', () => {
        it('успешно создаёт организацию', async () => {
            mockOrgsRepository.checkExistByParams.mockResolvedValue(null);
            mockPlansService.getByName.mockResolvedValue(mockPlan);
            mockOrgsRepository.create.mockResolvedValue(mockOrganization);
            mockLicensesService.registrateLicense.mockResolvedValue(true);
            mockUserService.createUser.mockResolvedValue(undefined);

            const result = await service.create(mockCreateOrgDto, mockAuthUser);

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

            await expect(service.create(mockCreateOrgDto, mockAuthUser)).rejects.toThrow(
                ConflictException
            );

            expect(mockOrgsRepository.create).not.toHaveBeenCalled();
        });

        it('бросает ConflictException если план не найден', async () => {
            mockOrgsRepository.checkExistByParams.mockResolvedValue(null);
            mockPlansService.getByName.mockRejectedValue(
                new ConflictException('Выбранный тарифный план не найден')
            );

            await expect(service.create(mockCreateOrgDto, mockAuthUser)).rejects.toThrow(
                ConflictException
            );

            expect(mockOrgsRepository.create).not.toHaveBeenCalled();
        });

        it('откатывает транзакцию если registrateLicense упал', async () => {
            mockOrgsRepository.checkExistByParams.mockResolvedValue(null);
            mockPlansService.getByName.mockResolvedValue(mockPlan);
            mockOrgsRepository.create.mockResolvedValue(mockOrganization);
            mockLicensesService.registrateLicense.mockRejectedValue(new Error('DB error'));

            await expect(service.create(mockCreateOrgDto, mockAuthUser)).rejects.toThrow(
                'DB error'
            );
        });

        it('откатывает транзакцию если createUser упал', async () => {
            mockOrgsRepository.checkExistByParams.mockResolvedValue(null);
            mockPlansService.getByName.mockResolvedValue(mockPlan);
            mockOrgsRepository.create.mockResolvedValue(mockOrganization);
            mockLicensesService.registrateLicense.mockResolvedValue(true);
            mockUserService.createUser.mockRejectedValue(new Error('User error'));

            await expect(service.create(mockCreateOrgDto, mockAuthUser)).rejects.toThrow(
                'User error'
            );
        });
    });

    describe('addLocationForOrg', () => {
        beforeEach(() => {
            mockPrismaService.$transaction.mockImplementation((cb: Function) => cb({}));
            mockUserService.checkExistUser.mockResolvedValue(true);
            mockOrgsRepository.checkExistByParams.mockResolvedValue(mockOrganization);
        });

        it('успешно создаёт локации', async () => {
            mockOrgsRepository.findLocationByParams.mockResolvedValue(false);
            mockOrgsRepository.createLocation.mockResolvedValue({});

            await service.addLocationForOrg(mockCreateLocationDto, mockAuthUser);

            expect(mockOrgsRepository.findLocationByParams).toHaveBeenCalledTimes(
                mockCreateLocationDto.locations.length
            );
            expect(mockOrgsRepository.createLocation).toHaveBeenCalledTimes(
                mockCreateLocationDto.locations.length
            );
        });

        it('бросает ConflictException если локация уже существует', async () => {
            mockOrgsRepository.findLocationByParams.mockResolvedValue(true);

            await expect(
                service.addLocationForOrg(mockCreateLocationDto, mockAuthUser)
            ).rejects.toThrow(ConflictException);

            expect(mockOrgsRepository.createLocation).not.toHaveBeenCalled();
        });

        it('бросает InternalServerErrorException если createLocation упал', async () => {
            mockOrgsRepository.findLocationByParams.mockResolvedValue(false);
            mockOrgsRepository.createLocation.mockRejectedValue(new Error('DB error'));

            await expect(
                service.addLocationForOrg(mockCreateLocationDto, mockAuthUser)
            ).rejects.toThrow(InternalServerErrorException);

            expect(mockLoggerService.error).toHaveBeenCalled();
        });

        it('бросает ConflictException если пользователь не найден', async () => {
            mockUserService.checkExistUser.mockResolvedValue(false);

            await expect(
                service.addLocationForOrg(mockCreateLocationDto, mockAuthUser)
            ).rejects.toThrow(ConflictException);

            expect(mockOrgsRepository.createLocation).not.toHaveBeenCalled();
        });

        it('бросает ConflictException если организация не найдена', async () => {
            mockOrgsRepository.checkExistByParams.mockResolvedValue(null);

            await expect(
                service.addLocationForOrg(mockCreateLocationDto, mockAuthUser)
            ).rejects.toThrow(ConflictException);

            expect(mockOrgsRepository.createLocation).not.toHaveBeenCalled();
        });

        it('бросает InternalServerErrorException если транзакция упала', async () => {
            mockPrismaService.$transaction.mockRejectedValue(new Error('Transaction error'));

            await expect(
                service.addLocationForOrg(mockCreateLocationDto, mockAuthUser)
            ).rejects.toThrow(InternalServerErrorException);
        });
    });
});
