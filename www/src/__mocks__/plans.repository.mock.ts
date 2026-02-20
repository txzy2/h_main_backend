import {PlansRepositoryInterface} from '@/plans/plans.repository';

export const mockPlansRepository: jest.Mocked<PlansRepositoryInterface> = {
    findByName: jest.fn(),
    getPlans: jest.fn()
};
