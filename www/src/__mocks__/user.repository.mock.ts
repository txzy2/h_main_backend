import {UsersRepositoryInterface} from '@/user/user.repository';

export const mockUserRepository: jest.Mocked<UsersRepositoryInterface> = {
    create: jest.fn(),
    checkExistByParams: jest.fn()
};
