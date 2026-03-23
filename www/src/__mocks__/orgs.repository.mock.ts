import {OrgsRepositoryInterface} from '@/orgs/orgs.repository';

export const mockOrgsRepository: jest.Mocked<OrgsRepositoryInterface> = {
    create: jest.fn(),
    update: jest.fn(),
    checkExistByParams: jest.fn(),
    findById: jest.fn(),
    findOrgInfoById: jest.fn()
};
