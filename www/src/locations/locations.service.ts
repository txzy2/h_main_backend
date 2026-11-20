import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    InternalServerErrorException,
    NotFoundException
} from '@nestjs/common';
import {
    LOCATIONS_REPOSITORY,
    type LocationWithFloorPlan,
    type LocationsRepositoryInterface
} from './locations.repository';
import {AppLoggerService} from '@/common/logger/logger.service';
import {ApiErrors} from '@/common/errors/api-errors';
import {UserService} from '@/user/user.service';
import {OrgsService} from '@/orgs/orgs.service';
import {CreateLocationDto, ReqLocation} from './dto/create-location.dto';
import {SaveFloorPlanDto} from './dto/save-floor-plan.dto';
import {UpdateLocationDto} from './dto/update-location.dto';
import {
    FloorPlanLayout,
    FloorPlanResponse,
    FloorPlanTableInput,
    FloorPlanTableShape
} from './floor-plan.types';
import {normalizeFloorPlanLayout} from './floor-plan.utils';
import {AuthUser} from '@/types';
import {getErrorMessage} from '@/common/errors/get-error-message';

import * as crypto from 'crypto';
import {Location} from '@prisma/client';
import {PrismaService} from '@/prisma/prisma.service';

@Injectable()
export class LocationsService {
    public constructor(
        @Inject(LOCATIONS_REPOSITORY)
        private readonly locationsRepository: LocationsRepositoryInterface,
        private readonly userService: UserService,
        private readonly orgService: OrgsService,
        private readonly prisma: PrismaService,
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

        // await this.orgService.getActiveOrg(data.org_id);

        try {
            const mapped = data.locations.map(loc => ({
                ...loc,
                uniqueHash: this.generateUniqueLocationHash(data.org_id, loc)
            }));

            return await this.prisma.$transaction(async tx => {
                await this.locationsRepository.createManyLocations(mapped, data.org_id, tx);
            });
        } catch (e: unknown) {
            this.logger.error('Failed to create locations', getErrorMessage(e));
            throw new InternalServerErrorException(ApiErrors.INTERNAL_SERVER_ERROR);
        }
    }

    public async updateLocation(
        user: AuthUser,
        locationId: number,
        body: UpdateLocationDto
    ): Promise<Location> {
        const location = await this.getLocationForUser(user, locationId);

        if (body.active_places !== undefined) {
            await this.locationsRepository.syncLocationTables(
                location,
                body.active_places,
                user.sub
            );
        }

        return this.locationsRepository.updateLocation(location.id, {
            ...(body.name !== undefined ? {name: body.name.trim()} : {}),
            ...(body.address !== undefined ? {address: body.address.trim()} : {}),
            ...(body.phone !== undefined ? {phone: body.phone.trim()} : {}),
            ...(body.active_places !== undefined
                ? {activePlaces: body.active_places}
                : {}),
            ...(body.status !== undefined ? {status: body.status} : {})
        });
    }

    public async getFloorPlan(
        user: AuthUser,
        locationId: number
    ): Promise<FloorPlanResponse> {
        const location = await this.getLocationForUser(user, locationId);
        const layout = location.floorPlan
            ? normalizeFloorPlanLayout(location.floorPlan.layout)
            : this.buildDefaultLayout(location);

        return {
            locationId: location.id,
            locationName: location.name,
            version: location.floorPlan?.version ?? 0,
            layout
        };
    }

    public async saveFloorPlan(
        user: AuthUser,
        locationId: number,
        body: SaveFloorPlanDto
    ): Promise<FloorPlanResponse> {
        const location = await this.getLocationForUser(user, locationId);
        const layout = this.validateLayout(body.layout, location);
        const saved = await this.locationsRepository.saveFloorPlan(
            locationId,
            user.sub,
            layout
        );

        return {
            locationId: location.id,
            locationName: location.name,
            version: saved.plan.version,
            layout: saved.layout
        };
    }

    private async getLocationForUser(
        user: AuthUser,
        locationId: number
    ): Promise<LocationWithFloorPlan> {
        const orgId = (await this.userService.getUserByParam({extId: user.sub})).orgId;
        const location = await this.locationsRepository.findLocationWithFloorPlan(
            locationId
        );

        if (!location || location.orgId !== orgId) {
            throw new NotFoundException('Точка не найдена');
        }

        return location;
    }

    private buildDefaultLayout(location: LocationWithFloorPlan): FloorPlanLayout {
        const width = 1200;
        const height = 800;
        const activeTables = location.locationTables.filter(table => table.isActive);
        const sourceTables = activeTables.length
            ? activeTables.map(table => ({
                  tableId: table.id as number | null,
                  name: table.name?.trim() || '',
                  seats: table.seats || 4
              }))
            : Array.from({length: location.activePlaces}, (_, index) => ({
                  tableId: null as number | null,
                  name: `Стол ${index + 1}`,
                  seats: 4
              }));
        const count = sourceTables.length;
        const cols = count
            ? Math.min(6, Math.max(1, Math.ceil(Math.sqrt(count * 2))))
            : 1;
        const rows = Math.max(1, Math.ceil(count / cols));
        const cellWidth = width / cols;
        const cellHeight = height / rows;
        const tableSize = 88;
        const tables: FloorPlanTableInput[] = sourceTables.map((table, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);

            return {
                id: table.tableId ? `table-${table.tableId}` : `new-${index + 1}`,
                tableId: table.tableId,
                name: table.name || `Стол ${index + 1}`,
                seats: table.seats,
                x: Math.round(col * cellWidth + (cellWidth - tableSize) / 2),
                y: Math.round(row * cellHeight + (cellHeight - tableSize) / 2),
                width: tableSize,
                height: tableSize,
                rotation: 0,
                shape: 'round',
                color: null
            };
        });

        return {
            version: 0,
            canvas: {width, height},
            tables,
            zones: [],
            objects: []
        };
    }

    private validateLayout(
        value: FloorPlanLayout,
        location: LocationWithFloorPlan
    ): FloorPlanLayout {
        const canvasWidth = Number(value?.canvas?.width ?? 1200);
        const canvasHeight = Number(value?.canvas?.height ?? 800);

        if (
            !Number.isFinite(canvasWidth) ||
            !Number.isFinite(canvasHeight) ||
            canvasWidth < 400 ||
            canvasWidth > 3000 ||
            canvasHeight < 400 ||
            canvasHeight > 3000
        ) {
            throw new BadRequestException('Некорректный размер плана зала');
        }

        const rawTables = Array.isArray(value?.tables) ? value.tables : [];
        if (rawTables.length > 200) {
            throw new BadRequestException('Слишком много столов на плане');
        }

        const locationTableIds = new Set(
            location.locationTables.map(table => table.id)
        );
        const clientIds = new Set<string>();
        const tableIds = new Set<number>();
        const tables: FloorPlanTableInput[] = rawTables.map((rawTable, index) => {
            const table = (rawTable ?? {}) as Partial<FloorPlanTableInput>;
            const id =
                typeof table.id === 'string' && table.id.trim()
                    ? table.id.trim()
                    : `table-${index + 1}`;

            if (clientIds.has(id)) {
                throw new BadRequestException('На плане есть дубли столов');
            }
            clientIds.add(id);

            let tableId: number | null = null;
            if (table.tableId !== undefined && table.tableId !== null) {
                const parsed = Number(table.tableId);
                if (
                    !Number.isInteger(parsed) ||
                    !locationTableIds.has(parsed) ||
                    tableIds.has(parsed)
                ) {
                    throw new BadRequestException(
                        'Стол не принадлежит точке или указан дважды'
                    );
                }
                tableId = parsed;
                tableIds.add(parsed);
            }

            const name =
                typeof table.name === 'string' && table.name.trim()
                    ? table.name.trim()
                    : `Стол ${index + 1}`;
            if (name.length > 100) {
                throw new BadRequestException('Слишком длинное название стола');
            }

            const seats = Number(table.seats);
            if (!Number.isInteger(seats) || seats < 1 || seats > 50) {
                throw new BadRequestException('Количество мест должно быть от 1 до 50');
            }

            const x = Number(table.x);
            const y = Number(table.y);
            const width = Number(table.width);
            const height = Number(table.height);
            const rotation = Number(table.rotation ?? 0);

            if (
                !Number.isFinite(x) ||
                !Number.isFinite(y) ||
                !Number.isFinite(width) ||
                !Number.isFinite(height) ||
                width < 40 ||
                width > 400 ||
                height < 40 ||
                height > 400
            ) {
                throw new BadRequestException('Некорректные размеры или позиция стола');
            }

            const shape: FloorPlanTableShape = table.shape === 'rect' ? 'rect' : 'round';
            const color =
                typeof table.color === 'string' && /^#[0-9a-f]{6}$/i.test(table.color)
                    ? table.color
                    : null;

            return {
                id,
                tableId,
                name,
                seats,
                x: Math.min(Math.max(x, 0), canvasWidth),
                y: Math.min(Math.max(y, 0), canvasHeight),
                width,
                height,
                rotation: ((rotation % 360) + 360) % 360,
                shape,
                color
            };
        });

        return {
            version: 1,
            canvas: {width: canvasWidth, height: canvasHeight},
            tables,
            zones: Array.isArray(value.zones) ? value.zones : [],
            objects: Array.isArray(value.objects) ? value.objects : []
        };
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
