import {ConflictException, Inject, Injectable, InternalServerErrorException} from '@nestjs/common';
import {CreateOrgDto} from './dto/create-org.dto';
import {ORGS_REPOSITORY, type OrgsRepositoryInterface} from './orgs.repository';
import {AuthUser} from '@/types';
import {Activity, Organization, Prisma} from '@prisma/client';
import {LicensesService} from '@/licenses/licenses.service';
import {UserService} from '@/user/user.service';
import {AppLoggerService} from '@/common/logger/logger.service';
import {PrismaService} from '@/prisma/prisma.service';
import {PlansService} from '@/plans/plans.service';
import {OrgResponseDto} from './dto/org-info.response.dto';
import {ApiErrors} from '@/common/errors/api-errors';
import {CreateLocationDto, ReqLocation} from './dto/create-location.dto';

import * as crypto from 'crypto';
import {getErrorMessage} from '@/common/errors/get-error-message';

@Injectable()
export class OrgsService {
    public constructor(
        @Inject(ORGS_REPOSITORY) private readonly orgsRepository: OrgsRepositoryInterface,
        private readonly userService: UserService,
        private readonly licensesService: LicensesService,
        private readonly logger: AppLoggerService,
        private readonly plansService: PlansService,
        private readonly prisma: PrismaService
    ) {
        this.logger.setContext(OrgsService.name);
    }

    /**
     * create - Создание организации
     *
     * @param {CreateOrgDto} orgData
     * @param {AuthUser} user
     *
     * @returns {Promise<Organization>}
     */
    public async create(orgData: CreateOrgDto, user: AuthUser): Promise<Organization> {
        const plan = await this.plansService.getByName(orgData.plan);

        try {
            return await this.prisma.$transaction(async tx => {
                const org = await this.orgsRepository.create(orgData, tx);
                await this.licensesService.registrateLicense(org.id, plan.id, tx);
                await this.userService.createUser(
                    {
                        name: user.name,
                        login: user.login,
                        extId: user.sub,
                        orgId: org.id,
                        phoneNumber: orgData.phone_number
                    },
                    tx
                );

                return org;
            });
        } catch (e: unknown) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new ConflictException(ApiErrors.ORG_IS_ALREADY_EXIST);
            }

            if (e instanceof ConflictException) {
                throw e;
            }

            this.logger.error('Org creation failed', getErrorMessage(e));
            throw new InternalServerErrorException(ApiErrors.INTERNAL_SERVER_ERROR);
        }
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
     * generateUniqueLocationHash - Генерирует уникальный SHA-256 хэш для локации
     *
     * @param {number} orgId - Идентификатор организации
     * @param {ReqLocation} locData - Данные локации
     *
     * @returns {string} HEX-строка SHA-256 хэша
     *
     */
    private generateUniqueLocationHash(orgId: number, locData: ReqLocation): string {
        const raw = `${orgId}:${locData.name.trim().toLowerCase()}:${locData.phone?.trim()}`;
        return crypto.createHash('sha256').update(raw).digest('hex');
    }

    /**
    * addLocationForOrg - Добавляет локации для организации.
    *
    * @param {CreateLocationDto} data - DTO с идентификатором организации и массивом локаций
    * @param {AuthUser} user - Авторизованный пользователь
    *
    * @throws {ConflictException} - `USER_NOT_FOUND` — если пользователь не принадлежит организации
    * @throws {ConflictException} `ORG_STATUS_IS_PENDING` — если организация на проверке
    * @throws {ConflictException} `ORG_NOT_FOUND_OR_INACTIVE` — если организация не найдена или неактивна

    * @throws {InternalServerErrorException} Если произошла ошибка при создании локаций
    *
    * @returns {Promise<void>}
    *
    */
    public async addLocationForOrg(data: CreateLocationDto, user: AuthUser): Promise<void> {
        if (
            !(await this.userService.checkExistUser({
                extId: user.sub,
                orgId: data.org_id
            }))
        ) {
            throw new ConflictException(ApiErrors.USER_NOT_FOUND);
        }

        await this.getActiveOrg(data.org_id);

        try {
            const mapped = data.locations.map(loc => ({
                ...loc,
                uniqueHash: this.generateUniqueLocationHash(data.org_id, loc)
            }));

            await this.orgsRepository.createManyLocations(mapped, data.org_id);
        } catch (e: unknown) {
            this.logger.error('Failed to create locations', getErrorMessage(e));
            throw new InternalServerErrorException(ApiErrors.INTERNAL_SERVER_ERROR);
        }
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
    private async getActiveOrg(orgId: number): Promise<OrgResponseDto> {
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
     * checkExistOrg - Проверка существования организации по переданным параметрам
     *
     * @param {Prisma.OrganizationWhereInput} params
     *
     * @returns {Promise<boolean>}
     *
     * @throws {ConflictException}
     */
    private async checkExistOrg(params: Prisma.OrganizationWhereInput): Promise<boolean> {
        return !!(await this.orgsRepository.checkExistByParams(params));
    }
}
