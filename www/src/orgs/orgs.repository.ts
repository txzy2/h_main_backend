import {PrismaService} from '@/prisma/prisma.service';
import {Injectable} from '@nestjs/common';
import {Activity, Location, Organization, Prisma} from '@prisma/client';
import {CreateOrgDto} from './dto/create-org.dto';
import {OrgResponseDto} from './dto/org-info.response.dto';
import {ReqLocation} from './dto/create-location.dto';
import {AppLoggerService} from '@/common/logger/logger.service';

export const ORGS_REPOSITORY = Symbol('ORGS_REPOSITORY');

export interface OrgsRepositoryInterface {
    findById(id: number): Promise<Organization | null>;
    findOrgInfoById(orgId: number): Promise<OrgResponseDto | null>;

    checkExistByParams(param: Prisma.OrganizationWhereInput): Promise<Organization | null>;

    create(data: CreateOrgDto, tx?: Prisma.TransactionClient): Promise<Organization>;

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
export class OrgsRepository implements OrgsRepositoryInterface {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(OrgsRepository.name);
    }

    /**
     * findById - Поиск организации по id
     *
     * @param {number} id
     *
     * @returns {Promise<Organization | null>}
     */
    public async findById(id: number): Promise<Organization | null> {
        return this.prisma.organization.findUnique({where: {id}});
    }

    /**
     * checkExistByParams - Провкрка организации по переданому параметру
     *
     * @param {Prisma.OrganizationWhereInput} params
     *
     * @returns {Promise<Organization | null>}
     */
    public async checkExistByParams(
        params: Prisma.OrganizationWhereInput
    ): Promise<Organization | null> {
        return await this.prisma.organization.findFirst({where: params});
    }

    /**
     * create - Создание организации
     *
     * @param {CreateOrgDto} org
     * @param {Prisma.TransactionClient} tx?
     *
     * @returns {Promise<Organization>}
     */
    public async create(org: CreateOrgDto, tx?: Prisma.TransactionClient): Promise<Organization> {
        const client = tx ?? this.prisma;

        const createdOrg = await client.organization.create({
            data: {
                name: org.name,
                inn: org.inn,
                kpp: org.kpp,
                director: org.director,
                status: Activity.Pending,
                updatedAt: new Date()
            }
        });

        this.logger.log(
            JSON.stringify({
                context: 'create',
                orgId: createdOrg.id,
                name: createdOrg.name
            })
        );

        return createdOrg;
    }

    /**
     * findLocationByParams - Проверяет существование локации по заданным параметрам.
     *
     * @param {Prisma.LocationWhereInput} params - Параметры поиска локации
     * @param {Prisma.TransactionClient} [tx] - Клиент транзакции (опционально)
     *
     * @returns {Promise<boolean>} true если локация найдена, false если нет
     *
     */
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

    /**
     * findOrgInfoById - Поиск организации по id
     *
     * @param {number} orgId
     *
     * @return {Promise<OrgResponseDto | null>}
     */
    public async findOrgInfoById(orgId: number): Promise<OrgResponseDto | null> {
        return await this.prisma.organization.findUnique({
            where: {
                id: orgId
            },
            include: {
                locations: true
            }
        });
    }
}
