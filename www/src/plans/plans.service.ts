import {ConflictException, Inject, Injectable} from '@nestjs/common';
import {PLANS_REPOSITORY, type PlansRepositoryInterface} from './plans.repository';
import {Plans} from '@prisma/client';
import {AppLoggerService} from '@/common/logger/logger.service';
import {ApiErrors} from '@/common/errors/api-errors';

@Injectable()
export class PlansService {
    public constructor(
        @Inject(PLANS_REPOSITORY) private readonly plansRepository: PlansRepositoryInterface,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(PlansService.name);
    }

    /**
     * getPlans - Получение списка всех тарифов
     *
     * @returns {Promise<Plans[]>}
     */
    public async getPlans(): Promise<Plans[]> {
        return this.plansRepository.getPlans();
    }

    /**
     * getByName - Получение тарифа по названию
     *
     * @param {string} name
     *
     * @returns {Promise<Plans>}
     *
     * @throws {ConflictException} - Тарифный план не найден
     */
    public async getByName(name: string): Promise<Plans> {
        const plan = await this.plansRepository.findByName(name);
        if (!plan) {
            this.logger.error(`Тарифный план ${name} не найден.`);
            throw new ConflictException(ApiErrors.TARIF_PLAN_NOT_FOUND);
        }
        return plan;
    }
}
