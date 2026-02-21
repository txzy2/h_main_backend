import {UserService} from '@/user/user.service';

export const mockUserService: jest.Mocked<UserService> = {
    createUser: jest.fn(),
    checkExistUser: jest.fn(),
    getUserByParam: jest.fn()
} as any;
