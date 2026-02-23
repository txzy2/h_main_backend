import {ConflictException, Inject, Injectable, InternalServerErrorException} from '@nestjs/common';
import {LOCATIONS_REPOSITORY, type LocationsRepositoryInterface} from './locations.repository';
import {AppLoggerService} from '@/common/logger/logger.service';
import {ApiErrors} from '@/common/errors/api-errors';
import {UserService} from '@/user/user.service';
import {OrgsService} from '@/orgs/orgs.service';
import {CreateLocationDto, ReqLocation} from './dto/create-location.dto';
import {AuthUser} from '@/types';
import {getErrorMessage} from '@/common/errors/get-error-message';

import * as crypto from 'crypto';

@Injectable()
export class LocationsService {
    public constructor(
        @Inject(LOCATIONS_REPOSITORY)
        private readonly locationsRepository: LocationsRepositoryInterface,
        private readonly userService: UserService,
        private readonly orgService: OrgsService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(LocationsService.name);
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
     *
     * @throws {InternalServerErrorException} Если произошла ошибка при создании локаций
     *
     * @returns {Promise<void>}
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

        await this.orgService.getActiveOrg(data.org_id);

        try {
            const mapped = data.locations.map(loc => ({
                ...loc,
                uniqueHash: this.generateUniqueLocationHash(data.org_id, loc)
            }));

            await this.locationsRepository.createManyLocations(mapped, data.org_id);
        } catch (e: unknown) {
            this.logger.error('Failed to create locations', getErrorMessage(e));
            throw new InternalServerErrorException(ApiErrors.INTERNAL_SERVER_ERROR);
        }
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
}
