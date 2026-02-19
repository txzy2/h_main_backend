import {PrismaService} from '@/prisma/prisma.service';
import {Injectable} from '@nestjs/common';
import {Organization} from '@prisma/client';

export const ORGS_REPOSITORY = Symbol('ORGS_REPOSITORY');

export interface OrgsRepositoryInterface {
    findById(id: number): Promise<Organization | null>;
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
}
