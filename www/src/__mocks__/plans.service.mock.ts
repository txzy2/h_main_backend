import {PlansService} from '@/plans/plans.service';

export const mockPlansService: jest.Mocked<PlansService> = {
    getByName: jest.fn(),
    getPlans: jest.fn()
} as any;
