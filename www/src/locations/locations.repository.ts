import {AppLoggerService} from '@/common/logger/logger.service';
import {ReqLocation} from './dto/create-location.dto';
import {PrismaService} from '@/prisma/prisma.service';
import {BadRequestException, Injectable} from '@nestjs/common';
import {Activity, Location, LocationFloorPlan, Prisma} from '@prisma/client';
import {FloorPlanLayout, FloorPlanTableInput} from './floor-plan.types';
import {findFreeTablePosition, normalizeFloorPlanLayout} from './floor-plan.utils';

export type LocationWithFloorPlan = Prisma.LocationGetPayload<{
    include: {floorPlan: true; locationTables: true};
}>;

export const LOCATIONS_REPOSITORY = Symbol('LOCATIONS_REPOSITORY');

export interface LocationsRepositoryInterface {
    findLocationByParams(
        params: Prisma.LocationWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<boolean>;

    createLocation(
        locData: ReqLocation,
        orgId: number,
        uniqueHash: string,
        tx?: Prisma.TransactionClient
    ): Promise<Location>;

    createManyLocations(
        data: (ReqLocation & {uniqueHash: string})[],
        orgId: number,
        tx?: Prisma.TransactionClient
    ): Promise<void>;

    updateLocation(id: number, data: Prisma.LocationUpdateInput): Promise<Location>;

    syncLocationTables(
        location: LocationWithFloorPlan,
        count: number,
        updatedBy: string
    ): Promise<void>;

    findLocationWithFloorPlan(locationId: number): Promise<LocationWithFloorPlan | null>;

    saveFloorPlan(
        locationId: number,
        updatedBy: string,
        layout: FloorPlanLayout
    ): Promise<{plan: LocationFloorPlan; layout: FloorPlanLayout}>;
}

@Injectable()
export class LocationsRepository implements LocationsRepositoryInterface {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(LocationsRepository.name);
    }

    public async findLocationByParams(
        params: Prisma.LocationWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<boolean> {
        const client = tx ?? this.prisma;
        return !!(await client.location.findFirst({where: params}));
    }

    /**
     * createLocation - Создангие точки для организации
     *
     * @param {ReqLocation} locData
     * @param {number} orgId
     * @param {Prisma.TransactionClient} tx?
     *
     * @returns {Promise<Location>}
     *
     */
    public async createLocation(
        locData: ReqLocation,
        orgId: number,
        uniqueHash: string,
        tx?: Prisma.TransactionClient
    ): Promise<Location> {
        const client = tx ?? this.prisma;

        return await client.location.create({
            data: {
                orgId,
                uniqueHash,
                name: locData.name,
                address: locData.address,
                phone: locData.phone,
                activePlaces: locData.active_places,
                status: Activity.Active
            }
        });
    }

    public async createManyLocations(
        data: (ReqLocation & {uniqueHash: string})[],
        orgId: number,
        tx?: Prisma.TransactionClient
    ): Promise<void> {
        const client = tx ?? this.prisma;

        const result = await client.location.createMany({
            data: data.map(loc => ({
                orgId,
                uniqueHash: loc.uniqueHash,
                name: loc.name,
                address: loc.address,
                phone: loc.phone,
                activePlaces: loc.active_places,
                status: Activity.Active
            })),
            skipDuplicates: true
        });

        this.logger.debug(
            `createManyLocations: requested=${data.length}, inserted=${result.count}, skipped=${data.length - result.count}`
        );
    }

    public async updateLocation(
        id: number,
        data: Prisma.LocationUpdateInput
    ): Promise<Location> {
        return this.prisma.location.update({
            where: {id},
            data
        });
    }

    /**
     * Синхронизирует количество физических столов точки с полем activePlaces.
     * Если план зала уже существует, добавляет/убирает столы и в нём.
     */
    public async syncLocationTables(
        location: LocationWithFloorPlan,
        count: number,
        updatedBy: string
    ): Promise<void> {
        const activeTables = location.locationTables.filter(table => table.isActive);

        if (activeTables.length === count) return;

        await this.prisma.$transaction(async tx => {
            const layout = location.floorPlan
                ? normalizeFloorPlanLayout(location.floorPlan.layout)
                : null;
            const sortedActive = activeTables
                .slice()
                .sort((left, right) => left.id - right.id);
            const sortedInactive = location.locationTables
                .filter(table => !table.isActive)
                .sort((left, right) => left.id - right.id);

            const addTableToLayout = (table: {
                id: number;
                name: string | null;
                seats: number;
            }) => {
                if (!layout) return;
                if (layout.tables.some(item => item.tableId === table.id)) return;

                const position = findFreeTablePosition(layout);

                layout.tables.push({
                    id: `table-${table.id}`,
                    tableId: table.id,
                    name: table.name || `Стол ${table.id}`,
                    seats: table.seats,
                    x: position.x,
                    y: position.y,
                    width: 88,
                    height: 88,
                    rotation: 0,
                    shape: 'round',
                    color: null
                });
            };

            if (count > sortedActive.length) {
                const reactivated = sortedInactive.slice(
                    0,
                    count - sortedActive.length
                );
                const activeAfterReactivate = [...sortedActive];

                for (const table of reactivated) {
                    const updated = await tx.locationTables.update({
                        where: {id: table.id},
                        data: {isActive: true}
                    });

                    activeAfterReactivate.push(updated);
                    addTableToLayout(updated);
                }

                const remaining = count - activeAfterReactivate.length;

                for (let index = 0; index < remaining; index += 1) {
                    const created = await tx.locationTables.create({
                        data: {
                            locationId: location.id,
                            name: `Стол ${activeAfterReactivate.length + index + 1}`,
                            seats: 4,
                            isActive: true
                        }
                    });

                    activeAfterReactivate.push(created);
                    addTableToLayout(created);
                }
            } else {
                const tablesToDeactivate = sortedActive.slice(count);
                const ids = tablesToDeactivate.map(table => table.id);

                await tx.locationTables.updateMany({
                    where: {id: {in: ids}},
                    data: {isActive: false}
                });

                if (layout) {
                    layout.tables = layout.tables.filter(
                        table => !table.tableId || !ids.includes(table.tableId)
                    );
                }
            }

            if (layout) {
                await tx.locationFloorPlan.update({
                    where: {locationId: location.id},
                    data: {
                        layout: layout as unknown as Prisma.InputJsonValue,
                        updatedBy,
                        version: {increment: 1}
                    }
                });
            }
        });
    }

    public async findLocationWithFloorPlan(
        locationId: number
    ): Promise<LocationWithFloorPlan | null> {
        return this.prisma.location.findUnique({
            where: {id: locationId},
            include: {
                floorPlan: true,
                locationTables: {orderBy: {id: 'asc'}}
            }
        });
    }

    public async saveFloorPlan(
        locationId: number,
        updatedBy: string,
        layout: FloorPlanLayout
    ): Promise<{plan: LocationFloorPlan; layout: FloorPlanLayout}> {
        return this.prisma.$transaction(async tx => {
            const location = await tx.location.findUnique({
                where: {id: locationId},
                include: {locationTables: true}
            });

            if (!location) {
                throw new BadRequestException('Точка не найдена');
            }

            const tablesById = new Map(
                location.locationTables.map(table => [table.id, table])
            );
            const usedTableIds = new Set<number>();
            const normalizedTables: FloorPlanTableInput[] = [];

            for (const table of layout.tables) {
                let tableId = table.tableId ?? null;

                if (tableId !== null) {
                    if (!tablesById.has(tableId) || usedTableIds.has(tableId)) {
                        throw new BadRequestException(
                            `Стол ${tableId} не принадлежит точке или указан дважды`
                        );
                    }

                    usedTableIds.add(tableId);
                    await tx.locationTables.update({
                        where: {id: tableId},
                        data: {name: table.name, seats: table.seats, isActive: true}
                    });
                } else {
                    const created = await tx.locationTables.create({
                        data: {
                            locationId,
                            name: table.name,
                            seats: table.seats
                        }
                    });

                    tableId = created.id;
                    usedTableIds.add(tableId);
                }

                normalizedTables.push({...table, tableId});
            }

            await tx.locationTables.updateMany({
                where: {
                    locationId,
                    ...(usedTableIds.size
                        ? {id: {notIn: [...usedTableIds]}}
                        : {})
                },
                data: {isActive: false}
            });

            const normalizedLayout: FloorPlanLayout = {
                ...layout,
                tables: normalizedTables
            };
            await tx.location.update({
                where: {id: locationId},
                data: {activePlaces: normalizedTables.length}
            });

            const plan = await tx.locationFloorPlan.upsert({
                where: {locationId},
                create: {
                    locationId,
                    width: layout.canvas.width,
                    height: layout.canvas.height,
                    layout: normalizedLayout as unknown as Prisma.InputJsonValue,
                    updatedBy,
                    version: 1
                },
                update: {
                    width: layout.canvas.width,
                    height: layout.canvas.height,
                    layout: normalizedLayout as unknown as Prisma.InputJsonValue,
                    updatedBy,
                    version: {increment: 1}
                }
            });

            return {plan, layout: normalizedLayout};
        });
    }
}
