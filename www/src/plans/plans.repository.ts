import {PrismaService} from '@/infrastructure/prisma/prisma.service';
import {Injectable} from '@nestjs/common';
import {Plans} from '@prisma/client';

export const PLANS_REPOSITORY = Symbol('PLANS_REPOSITORY');

export interface PlansRepositoryInterface {
    findByName(name: string): Promise<Plans | null>;
    getPlans(): Promise<Plans[]>;
}

@Injectable()
export class PlansRepository implements PlansRepositoryInterface {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * findByName - Поиск плана по названию
     *
     * @param {string} name
     *
     * @returns {Promise<Plans | null>}
     */
    async findByName(name: string): Promise<Plans | null> {
        return this.prisma.plans.findUnique({where: {name}});
    }

    /**
     * getPlans - Получение всех планов
     *
     * @returns {Promise<Plans[]>}
     */
    async getPlans(): Promise<Plans[]> {
        return this.prisma.plans.findMany();
    }
}
