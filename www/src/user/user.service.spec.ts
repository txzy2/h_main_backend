import {Test, TestingModule} from '@nestjs/testing';

import {UserService} from './user.service';
import {USERS_REPOSITORY} from './user.repository';
import {mockLoggerService, mockCreateUser, mockUserRepository} from '@/__mocks__';
import {AppLoggerService} from '@/common/logger/logger.service';
import {ConflictException} from '@nestjs/common';

describe('UserService', () => {
    let service: UserService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                {provide: USERS_REPOSITORY, useValue: mockUserRepository},
                {provide: AppLoggerService, useValue: mockLoggerService}
            ]
        }).compile();

        service = module.get<UserService>(UserService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('createUser', () => {
        it('успешно создаёт пользователя', async () => {
            mockUserRepository.checkExistByParams.mockResolvedValue(null);
            mockUserRepository.create.mockResolvedValue(undefined);

            await service.createUser(mockCreateUser);

            expect(mockUserRepository.create).toHaveBeenCalledTimes(1);
            expect(mockUserRepository.create).toHaveBeenCalledWith(mockCreateUser, undefined);
        });

        it('передаёт tx в репозиторий', async () => {
            const tx = {} as any;
            mockUserRepository.checkExistByParams.mockResolvedValue(null);
            mockUserRepository.create.mockResolvedValue(undefined);

            await service.createUser(mockCreateUser, tx);

            expect(mockUserRepository.create).toHaveBeenCalledWith(mockCreateUser, tx);
        });

        it('бросает ConflictException если пользователь уже существует', async () => {
            mockUserRepository.checkExistByParams.mockResolvedValue(mockCreateUser);

            await expect(service.createUser(mockCreateUser)).rejects.toThrow(ConflictException);

            expect(mockUserRepository.create).not.toHaveBeenCalled();
        });

        it('пробрасывает ошибку если репозиторий упал', async () => {
            mockUserRepository.checkExistByParams.mockRejectedValue(new Error('DB error'));

            await expect(service.createUser(mockCreateUser)).rejects.toThrow('DB error');
        });
    });
});
