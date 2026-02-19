import {PrismaService} from '@/prisma/prisma.service';
import {Injectable} from '@nestjs/common';
import {Activity, Organization, Prisma} from '@prisma/client';
import {CreateOrgDto} from './dto/create-org.dto';

export const ORGS_REPOSITORY = Symbol('ORGS_REPOSITORY');

export interface OrgsRepositoryInterface {
    findById(id: number): Promise<Organization | null>;
    checkExistByParams(param: Prisma.OrganizationWhereInput): Promise<Organization | null>;

    create(data: CreateOrgDto, tx?: Prisma.TransactionClient): Promise<Organization>;
}

@Injectable()
export class OrgsRepository implements OrgsRepositoryInterface {
    public constructor(private readonly prisma: PrismaService) {}

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

    public async checkExistByParams(
        params: Prisma.OrganizationWhereInput
    ): Promise<Organization | null> {
        return await this.prisma.organization.findFirst({where: params});
    }

    public async create(org: CreateOrgDto, tx?: Prisma.TransactionClient): Promise<Organization> {
        const client = tx ?? this.prisma;

        return client.organization.create({
            data: {
                name: org.name,
                inn: org.inn,
                kpp: org.kpp,
                director: org.director,
                status: Activity.Pending,
                updatedAt: new Date()
            }
        });
    }
}
