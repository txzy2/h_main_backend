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
        await this.checkExistOrg({
            name: orgData.name,
            inn: orgData.inn
        });

        const plan = await this.plansService.getByName(orgData.plan);
        const newOrg = await this.prisma.runTransaction(async tx => {
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

        return newOrg;
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
        const orgData = await this.orgsRepository.findOrgInfoById(existUser.orgId);
        if (!orgData || orgData.status !== Activity.Active) {
            throw new ConflictException(ApiErrors.ORG_NOT_FOUND_OR_INACTIVE);
        }

        return orgData;
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
     * @throws {ConflictException} Если локация с таким названием и телефоном уже существует
     * @throws {InternalServerErrorException} Если произошла ошибка при создании локаций
     *
     * @returns {Promise<void>}
     *
     */
    public async addLocationForOrg(data: CreateLocationDto, user: AuthUser): Promise<void> {
        await this.userService.checkExistUser({
            extId: user.sub,
            orgId: data.org_id
        });

        try {
            await this.prisma.$transaction(async tx => {
                await Promise.all(
                    data.locations.map(async loc => {
                        const hash = this.generateUniqueLocationHash(data.org_id, loc);
                        if (
                            await this.orgsRepository.findLocationByParams({uniqueHash: hash}, tx)
                        ) {
                            throw new ConflictException(
                                ApiErrors.LOCATION_IS_ALREADY_EXIST(loc.name)
                            );
                        }

                        return this.orgsRepository.createLocation(loc, data.org_id, hash, tx);
                    })
                );
            });
        } catch (error) {
            if (error instanceof ConflictException) {
                throw error;
            }

            this.logger.error(
                `Failed to create locations`,
                error instanceof Error ? error.stack : (error as string)
            );
            throw new InternalServerErrorException(ApiErrors.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * checkExistOrg - Проверка существования организации по переданным параметрам
     *
     * @param {Prisma.OrganizationWhereInput} params
     *
     * @returns {Promise<void>}
     *
     * @throws {ConflictException}
     */
    private async checkExistOrg(params: Prisma.OrganizationWhereInput): Promise<void> {
        const org = await this.orgsRepository.checkExistByParams({
            OR: Object.entries(params).map(([key, value]) => ({[key]: value}))
        });

        if (org) {
            throw new ConflictException({
                message: ApiErrors.ORG_IS_ALREADY_EXIST,
                data: {
                    name: org.name,
                    inn: org.inn,
                    kpp: org.kpp,
                    director: org.director
                }
            });
        }
    }
}
