import {Test, TestingModule} from '@nestjs/testing';
import {ConflictException, NotFoundException} from '@nestjs/common';
import {OrgsService} from './orgs.service';
import {ORGS_REPOSITORY} from './orgs.repository';
import {UserService} from '@/user/user.service';
import {AppLoggerService} from '@/common/logger/logger.service';
import {
    mockAuthUser,
    mockCreateUser,
    mockLoggerService,
    mockActiveOrgResponse,
    mockOrganization,
    mockOrgsRepository
} from '@/__mocks__';
import {mockUserService} from '@/__mocks__/user.service.mock';
import {Activity} from '@prisma/client';
import {ApiErrors} from '@/common/errors/api-errors';

describe('OrgsService', () => {
    let service: OrgsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrgsService,
                {provide: ORGS_REPOSITORY, useValue: mockOrgsRepository},
                {provide: UserService, useValue: mockUserService},
                {provide: AppLoggerService, useValue: mockLoggerService}
            ]
        }).compile();

        service = module.get<OrgsService>(OrgsService);
    });

    afterEach(() => jest.clearAllMocks());

    // ===========================
    // getOrgInfo
    // ===========================
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

    // ===========================
    // getActiveOrg
    // ===========================
    describe('getActiveOrg', () => {
        it('возвращает активную организацию по orgId', async () => {
            mockOrgsRepository.findOrgInfoById.mockResolvedValue(mockActiveOrgResponse);

            const result = await service.getActiveOrg(mockOrganization.id);
            expect(result).toEqual(mockActiveOrgResponse);
        });

        it('бросает ConflictException если статус Pending', async () => {
            mockOrgsRepository.findOrgInfoById.mockResolvedValue({
                ...mockActiveOrgResponse,
                status: Activity.Pending
            });

            const err = await service.getActiveOrg(mockOrganization.id).catch(e => e);
            expect(err).toBeInstanceOf(ConflictException);
            expect((err as ConflictException).getResponse()).toMatchObject({
                message: ApiErrors.ORG_STATUS_IS_PENDING
            });
        });

        it('бросает ConflictException если организация не найдена', async () => {
            mockOrgsRepository.findOrgInfoById.mockResolvedValue(null);

            const err = await service.getActiveOrg(mockOrganization.id).catch(e => e);
            expect(err).toBeInstanceOf(ConflictException);
            expect((err as ConflictException).getResponse()).toMatchObject({
                message: ApiErrors.ORG_NOT_FOUND_OR_INACTIVE
            });
        });
    });

    // ===========================
    // ensureOrgExistsByHash
    // ===========================
    describe('ensureOrgExistsByHash', () => {
        it('возвращает организацию если найдена по хэшу и активна', async () => {
            mockOrgsRepository.checkExistByParams.mockResolvedValue(mockOrganization);

            const result = await service.ensureOrgExistsByHash(mockOrganization.uniqueHash);
            expect(result).toEqual(mockOrganization);
            expect(mockOrgsRepository.checkExistByParams).toHaveBeenCalledWith({
                AND: [{uniqueHash: mockOrganization.uniqueHash}, {status: Activity.Active}]
            });
        });

        it('бросает NotFoundException если организация не найдена', async () => {
            mockOrgsRepository.checkExistByParams.mockResolvedValue(null);

            const err = await service
                .ensureOrgExistsByHash(mockOrganization.uniqueHash)
                .catch(e => e);
            expect(err).toBeInstanceOf(NotFoundException);
            expect((err as NotFoundException).getResponse()).toMatchObject({
                message: ApiErrors.ORG_NOT_FOUND_OR_INACTIVE
            });
        });
    });

    // ===========================
    // ensureUserBelongsToOrgOrThrow
    // ===========================
    describe('ensureUserBelongsToOrgOrThrow', () => {
        it('успешно завершается если пользователь принадлежит организации', async () => {
            mockUserService.checkExistUser.mockResolvedValue(true);

            await expect(
                service.ensureUserBelongsToOrgOrThrow(mockAuthUser.sub, mockOrganization.id)
            ).resolves.toBeUndefined();

            expect(mockUserService.checkExistUser).toHaveBeenCalledWith({
                AND: [{orgId: mockOrganization.id}, {extId: {contains: mockAuthUser.sub}}]
            });
        });

        it('бросает NotFoundException если пользователь не принадлежит организации', async () => {
            mockUserService.checkExistUser.mockResolvedValue(false);

            const err = await service
                .ensureUserBelongsToOrgOrThrow(mockAuthUser.sub, mockOrganization.id)
                .catch(e => e);
            expect(err).toBeInstanceOf(NotFoundException);
            expect((err as NotFoundException).getResponse()).toMatchObject({
                message: ApiErrors.USER_NOT_FOUND
            });
        });
    });

    // ===========================
    // generateOrgHashData
    // ===========================
    describe('generateOrgHashData', () => {
        it('возвращает sha256 хэш из name, inn, kpp', () => {
            const hashData = {
                name: mockOrganization.name,
                inn: mockOrganization.inn,
                kpp: mockOrganization.kpp
            };

            const result = service.generateOrgHashData(hashData);
            expect(typeof result).toBe('string');
            expect(result).toHaveLength(64); // sha256 hex = 64 символа
        });

        it('возвращает одинаковый хэш для одинаковых данных', () => {
            const hashData = {name: 'Тест', inn: '123456789012', kpp: '123456789'};
            expect(service.generateOrgHashData(hashData)).toBe(
                service.generateOrgHashData(hashData)
            );
        });

        it('возвращает разные хэши для разных данных', () => {
            const a = service.generateOrgHashData({
                name: 'А',
                inn: '111111111111',
                kpp: '111111111'
            });
            const b = service.generateOrgHashData({
                name: 'Б',
                inn: '222222222222',
                kpp: '222222222'
            });
            expect(a).not.toBe(b);
        });
    });

    // ===========================
    // validateOrgHashData
    // ===========================
    describe('validateOrgHashData', () => {
        it('возвращает true если хэш совпадает', () => {
            const hashData = {name: 'Тест', inn: '123456789012', kpp: '123456789'};
            const hash = service.generateOrgHashData(hashData);
            expect(service.validateOrgHashData(hash, hashData)).toBe(true);
        });

        it('возвращает false если хэш не совпадает', () => {
            const hashData = {name: 'Тест', inn: '123456789012', kpp: '123456789'};
            expect(service.validateOrgHashData('неверный_хэш', hashData)).toBe(false);
        });
    });
});
