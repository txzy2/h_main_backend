import {PrismaService} from '@/infrastructure/prisma/prisma.service';
import {Injectable} from '@nestjs/common';
import {Activity, Organization, Prisma} from '@prisma/client';
import {AppLoggerService} from '@/common/logger/logger.service';

import {CreateOrgDto, FilterOrgsRequestDto, OrgResponseDto} from './dto';

export const ORGS_REPOSITORY = Symbol('ORGS_REPOSITORY');

export interface OrgsRepositoryInterface {
    findById(id: number): Promise<Organization | null>;
    findOrgInfoById(orgId: number): Promise<OrgResponseDto | null>;

    getAllOrgs(
        queryParams: FilterOrgsRequestDto,
        tx?: Prisma.TransactionClient
    ): Promise<OrgResponseDto[]>;

    checkExistByParams(param: Prisma.OrganizationWhereInput): Promise<Organization | null>;

    create(org: CreateOrgDto, hash: string, tx?: Prisma.TransactionClient): Promise<Organization>;
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
     * getAllOrgs - Получение всех орагнизаций с пагинацией
     *
     * @param {FilterOrgsRequestDto} queryParams
     * @param {Prisma.TransactionClient} tx?
     *
     * @returns {Promise<OrgResponseDto[]>}
     */
    public async getAllOrgs(
        queryParams: FilterOrgsRequestDto,
        tx?: Prisma.TransactionClient
    ): Promise<OrgResponseDto[]> {
        const client = tx ?? this.prisma;
        return await client.organization.findMany({
            include: {
                locations: true
            },
            take: queryParams.limit,
            skip: queryParams.offset
        });
    }

    /**
     * create - Создание организации
     *
     * @param {CreateOrgDto} org
     * @param {Prisma.TransactionClient} tx?
     *
     * @returns {Promise<Organization>}
     */
    public async create(
        org: CreateOrgDto,
        hash: string,
        tx?: Prisma.TransactionClient
    ): Promise<Organization> {
        const client = tx ?? this.prisma;

        const createdOrg = await client.organization.create({
            data: {
                name: org.name,
                inn: org.inn,
                kpp: org.kpp,
                director: org.director,
                uniqueHash: hash,
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
