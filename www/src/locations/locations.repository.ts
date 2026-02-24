import {AppLoggerService} from '@/common/logger/logger.service';
import {ReqLocation} from './dto/create-location.dto';
import {PrismaService} from '@/infrastructure/prisma/prisma.service';
import {Injectable} from '@nestjs/common';
import {Activity, Location, Prisma} from '@prisma/client';

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

    createManyLocations(data: (ReqLocation & {uniqueHash: string})[], orgId: number): Promise<void>;
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
}
