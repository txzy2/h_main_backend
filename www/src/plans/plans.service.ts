import {Inject, Injectable} from '@nestjs/common';
import {PLANS_REPOSITORY, type PlansRepositoryInterface} from './plans.repository';
import {Plans} from '@prisma/client';

@Injectable()
export class PlansService {
    public constructor(
        @Inject(PLANS_REPOSITORY) private readonly plansRepository: PlansRepositoryInterface
    ) {}

    public async getPlans(): Promise<Plans[]> {
        return this.plansRepository.getPlans();
    }
}
