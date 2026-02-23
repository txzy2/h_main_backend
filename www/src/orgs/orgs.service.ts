import {ConflictException, Inject, Injectable, NotFoundException} from '@nestjs/common';
import {AuthUser, OrgHashData} from '@/types';
import {Activity, Organization, Prisma} from '@prisma/client';
import {UserService} from '@/user/user.service';
import {AppLoggerService} from '@/common/logger/logger.service';
import {ApiErrors} from '@/common/errors/api-errors';
import {ORGS_REPOSITORY, type OrgsRepositoryInterface} from './orgs.repository';
import {OrgResponseDto} from './dto';

import * as crypto from 'crypto';

@Injectable()
export class OrgsService {
    public constructor(
        @Inject(ORGS_REPOSITORY) private readonly orgsRepository: OrgsRepositoryInterface,
        private readonly userService: UserService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(OrgsService.name);
    }

    /**
     * getOrgInfo - Получение организации и точек к которой привязан пользователь
     *
     * @param {AuthUser} user
     *
     * @returns {Promise<OrgResponseDto>}
     *
     * @throws {ConflictException}
     */
    public async getOrgInfo(user: AuthUser): Promise<OrgResponseDto> {
        const existUser = await this.userService.getUserByParam({extId: user.sub});
        return this.getActiveOrg(existUser.orgId);
    }

    /**
     * Находит и возвращает активную организацию по идентификатору.
     *
     * @param {number} orgId - Идентификатор организации
     *
     * @returns {Promise<OrgResponseDto>} - Данные организации
     *
     * @throws {ConflictException} `ORG_STATUS_IS_PENDING` — если организация на проверке
     * @throws {ConflictException} `ORG_NOT_FOUND_OR_INACTIVE` — если организация не найдена или неактивна
     */
    public async getActiveOrg(orgId: number): Promise<OrgResponseDto> {
        const orgData = await this.orgsRepository.findOrgInfoById(orgId);
        if (!orgData || orgData.status !== Activity.Active) {
            if (orgData?.status === Activity.Pending) {
                throw new ConflictException(ApiErrors.ORG_STATUS_IS_PENDING);
            }
            throw new ConflictException(ApiErrors.ORG_NOT_FOUND_OR_INACTIVE);
        }

        return orgData;
    }

    /**
     * Проверяет существование организации по уникальному хэшу.
     *
     * Выполняет поиск активной организации по переданному хэшу.
     * Если организация не найдена или неактивна — выбрасывает исключение (обрабатывается внутри `getOrgByParams`).
     *
     * @param {string} hash - Уникальный хэш организации (`uniqueHash`).
     * @returns {Promise<Organization>} Найденная активная организация.
     * @throws {NotFoundException} Если организация с данным хэшем не найдена или неактивна.
     */
    public async ensureOrgExistsByHash(hash: string): Promise<Organization> {
        return this.getOrgByParams({
            AND: [{uniqueHash: hash}, {status: Activity.Active}]
        });
    }

    public generateOrgHashData(hashData: OrgHashData): string {
        return crypto
            .createHash('sha256')
            .update(`${hashData.name}:${hashData.inn}:${hashData.kpp}`)
            .digest('hex');
    }

    public validateOrgHashData(hash: string, hashData: OrgHashData): boolean {
        return hash === this.generateOrgHashData(hashData);
    }

    /**
     * Проверяет, принадлежит ли пользователь указанной организации.
     *
     * Выполняет проверку наличия пользователя в организации по `orgId` и `extId`.
     * Если пользователь не найден — выбрасывает `NotFoundException`.
     *
     * @param {string} userId - Внешний идентификатор пользователя (`extId`). Поиск выполняется через `contains`.
     * @param {number} orgId - Идентификатор организации.
     * @returns {Promise<void>} Ничего не возвращает. Успешное выполнение означает, что пользователь принадлежит организации.
     * @throws {NotFoundException} Если пользователь не найден в указанной организации (код ошибки: `ApiErrors.USER_NOT_FOUND`).
     */
    public async ensureUserBelongsToOrgOrThrow(userId: string, orgId: number): Promise<void> {
        const exists = await this.userService.checkExistUser({
            AND: [{orgId}, {extId: {contains: userId}}]
        });

        if (!exists) {
            throw new NotFoundException(ApiErrors.USER_NOT_FOUND);
        }
    }

    /**
     * getOrgByParams - Проверка существования организации по переданным параметрам
     *
     * @param {Prisma.OrganizationWhereInput} params
     *
     * @returns {Promise<Organization>}
     *
     * @throws {ConflictException}
     */
    private async getOrgByParams(params: Prisma.OrganizationWhereInput): Promise<Organization> {
        const org = await this.orgsRepository.checkExistByParams(params);
        if (!org) {
            throw new NotFoundException(ApiErrors.ORG_NOT_FOUND_OR_INACTIVE);
        }

        return org;
    }
}
