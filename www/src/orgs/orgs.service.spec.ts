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
    mockCreateUser,
    mockLoggerService,
    mockActiveOrgResponse,
    mockOrganization,
    mockOrgsRepository,
    mockPlan,
    mockPrismaService
} from '@/__mocks__';
import {mockLicensesService} from '@/__mocks__/licenses.service.mock';
import {mockUserService} from '@/__mocks__/user.service.mock';
import {PlansService} from '@/plans/plans.service';
import {mockPlansService} from '@/__mocks__/plans.service.mock';
import {Activity, Prisma} from '@prisma/client';
import {ApiErrors} from '@/common/errors/api-errors';

/** Имитация клиента транзакции Prisma, передаётся в callback $transaction */
const txClient = {};

describe('OrgsService', () => {
    let service: OrgsService;

    beforeEach(async () => {
        (mockPrismaService.$transaction as jest.Mock).mockImplementation(
            (cb: (tx: typeof txClient) => Promise<unknown>) => cb(txClient)
        );

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
        beforeEach(() => {
            mockPlansService.getByName.mockResolvedValue(mockPlan);
            mockOrgsRepository.create.mockResolvedValue(mockOrganization);
            mockLicensesService.registrateLicense.mockResolvedValue(true);
            mockUserService.createUser.mockResolvedValue(undefined);
        });

        it('успешно создаёт организацию в транзакции', async () => {
            const result = await service.create(mockCreateOrgDto, mockAuthUser);

            expect(result).toEqual(mockOrganization);
            expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
            expect(mockOrgsRepository.create).toHaveBeenCalledWith(mockCreateOrgDto, txClient);
            expect(mockLicensesService.registrateLicense).toHaveBeenCalledWith(
                mockOrganization.id,
                mockPlan.id,
                txClient
            );
            expect(mockUserService.createUser).toHaveBeenCalledWith(
                {
                    name: mockAuthUser.name,
                    login: mockAuthUser.login,
                    extId: mockAuthUser.sub,
                    orgId: mockOrganization.id,
                    phoneNumber: mockCreateOrgDto.phone_number
                },
                txClient
            );
        });

        it('бросает ConflictException при P2002 (уникальное ограничение)', async () => {
            const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002',
                clientVersion: '0.0.0'
            });
            mockOrgsRepository.create.mockRejectedValue(p2002);

            const err = await service.create(mockCreateOrgDto, mockAuthUser).catch(e => e);
            expect(err).toBeInstanceOf(ConflictException);
            expect((err as ConflictException).getResponse()).toMatchObject({
                message: ApiErrors.ORG_IS_ALREADY_EXIST
            });
        });

        it('пробрасывает ConflictException из вложенных сервисов', async () => {
            mockPlansService.getByName.mockRejectedValue(
                new ConflictException(ApiErrors.TARIF_PLAN_NOT_FOUND)
            );

            await expect(service.create(mockCreateOrgDto, mockAuthUser)).rejects.toThrow(
                ConflictException
            );
            expect(mockOrgsRepository.create).not.toHaveBeenCalled();
        });

        it('откатывает транзакцию при ошибке registrateLicense и бросает InternalServerErrorException', async () => {
            mockLicensesService.registrateLicense.mockRejectedValue(new Error('DB error'));

            await expect(service.create(mockCreateOrgDto, mockAuthUser)).rejects.toThrow(
                InternalServerErrorException
            );
            expect(mockLoggerService.error).toHaveBeenCalledWith(
                'Org creation failed',
                expect.any(String)
            );
        });

        it('откатывает транзакцию при ошибке createUser и бросает InternalServerErrorException', async () => {
            mockUserService.createUser.mockRejectedValue(new Error('User error'));

            await expect(service.create(mockCreateOrgDto, mockAuthUser)).rejects.toThrow(
                InternalServerErrorException
            );
            expect(mockLoggerService.error).toHaveBeenCalledWith(
                'Org creation failed',
                expect.any(String)
            );
        });

        it('бросает InternalServerErrorException при прочей ошибке в транзакции', async () => {
            mockOrgsRepository.create.mockRejectedValue(new Error('Unknown error'));

            await expect(service.create(mockCreateOrgDto, mockAuthUser)).rejects.toThrow(
                InternalServerErrorException
            );
            expect(mockLoggerService.error).toHaveBeenCalledWith(
                'Org creation failed',
                expect.any(String)
            );
        });
    });

    describe('getOrgInfo', () => {
        it('возвращает данные активной организации по пользователю', async () => {
            mockUserService.getUserByParam.mockResolvedValue(mockCreateUser);
            mockOrgsRepository.findOrgInfoById.mockResolvedValue(mockActiveOrgResponse);

            const result = await service.getOrgInfo(mockAuthUser);

            expect(result).toEqual(mockActiveOrgResponse);
            expect(mockUserService.getUserByParam).toHaveBeenCalledWith({
                extId: mockAuthUser.sub
            });
            expect(mockOrgsRepository.findOrgInfoById).toHaveBeenCalledWith(mockCreateUser.orgId);
        });

        it('бросает ConflictException если организация в статусе Pending', async () => {
            mockUserService.getUserByParam.mockResolvedValue(mockCreateUser);
            mockOrgsRepository.findOrgInfoById.mockResolvedValue({
                ...mockActiveOrgResponse,
                status: Activity.Pending
            });

            const err = await service.getOrgInfo(mockAuthUser).catch(e => e);
            expect(err).toBeInstanceOf(ConflictException);
            expect((err as ConflictException).getResponse()).toMatchObject({
                message: ApiErrors.ORG_STATUS_IS_PENDING
            });
        });

        it('бросает ConflictException если организация не найдена или неактивна', async () => {
            mockUserService.getUserByParam.mockResolvedValue(mockCreateUser);
            mockOrgsRepository.findOrgInfoById.mockResolvedValue(null);

            const err = await service.getOrgInfo(mockAuthUser).catch(e => e);
            expect(err).toBeInstanceOf(ConflictException);
            expect((err as ConflictException).getResponse()).toMatchObject({
                message: ApiErrors.ORG_NOT_FOUND_OR_INACTIVE
            });
        });
    });

    describe('addLocationForOrg', () => {
        beforeEach(() => {
            mockUserService.checkExistUser.mockResolvedValue(true);
            mockOrgsRepository.findOrgInfoById.mockResolvedValue(mockActiveOrgResponse);
            mockOrgsRepository.createManyLocations.mockResolvedValue(undefined);
        });

        it('успешно добавляет локации с uniqueHash', async () => {
            await service.addLocationForOrg(mockCreateLocationDto, mockAuthUser);

            expect(mockUserService.checkExistUser).toHaveBeenCalledWith({
                extId: mockAuthUser.sub,
                orgId: mockCreateLocationDto.org_id
            });
            expect(mockOrgsRepository.findOrgInfoById).toHaveBeenCalledWith(
                mockCreateLocationDto.org_id
            );
            expect(mockOrgsRepository.createManyLocations).toHaveBeenCalledTimes(1);
            const [mapped, orgId] = mockOrgsRepository.createManyLocations.mock.calls[0];
            expect(orgId).toBe(mockCreateLocationDto.org_id);
            expect(mapped).toHaveLength(mockCreateLocationDto.locations.length);
            expect(
                mapped.every((loc: {uniqueHash: string}) => typeof loc.uniqueHash === 'string')
            ).toBe(true);
        });

        it('бросает ConflictException если пользователь не принадлежит организации', async () => {
            mockUserService.checkExistUser.mockResolvedValue(false);

            const err = await service
                .addLocationForOrg(mockCreateLocationDto, mockAuthUser)
                .catch(e => e);
            expect(err).toBeInstanceOf(ConflictException);
            expect((err as ConflictException).getResponse()).toMatchObject({
                message: ApiErrors.USER_NOT_FOUND
            });
            expect(mockOrgsRepository.createManyLocations).not.toHaveBeenCalled();
        });

        it('бросает ConflictException если организация в статусе Pending', async () => {
            mockOrgsRepository.findOrgInfoById.mockResolvedValue({
                ...mockActiveOrgResponse,
                status: Activity.Pending
            });

            const err = await service
                .addLocationForOrg(mockCreateLocationDto, mockAuthUser)
                .catch(e => e);
            expect(err).toBeInstanceOf(ConflictException);
            expect((err as ConflictException).getResponse()).toMatchObject({
                message: ApiErrors.ORG_STATUS_IS_PENDING
            });
            expect(mockOrgsRepository.createManyLocations).not.toHaveBeenCalled();
        });

        it('бросает ConflictException если организация не найдена или неактивна', async () => {
            mockOrgsRepository.findOrgInfoById.mockResolvedValue(null);

            const err = await service
                .addLocationForOrg(mockCreateLocationDto, mockAuthUser)
                .catch(e => e);
            expect(err).toBeInstanceOf(ConflictException);
            expect((err as ConflictException).getResponse()).toMatchObject({
                message: ApiErrors.ORG_NOT_FOUND_OR_INACTIVE
            });
            expect(mockOrgsRepository.createManyLocations).not.toHaveBeenCalled();
        });

        it('бросает InternalServerErrorException при ошибке createManyLocations', async () => {
            mockOrgsRepository.createManyLocations.mockRejectedValue(new Error('DB error'));

            await expect(
                service.addLocationForOrg(mockCreateLocationDto, mockAuthUser)
            ).rejects.toThrow(InternalServerErrorException);
            expect(mockLoggerService.error).toHaveBeenCalledWith(
                'Failed to create locations',
                expect.any(String)
            );
        });
    });
});
