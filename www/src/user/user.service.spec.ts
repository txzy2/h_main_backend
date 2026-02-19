import {Test, TestingModule} from '@nestjs/testing';

import {UserService} from './user.service';
import {USERS_REPOSITORY} from './user.repository';
import {mockLoggerService, mockAuthUser, mockCreateUser, mockUserRepository} from '@/__mocks__';
import {AppLoggerService} from '@/common/logger/logger.service';

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

        it('не создаёт пользователя если он уже существует', async () => {
            mockUserRepository.checkExistByParams.mockResolvedValue(mockCreateUser);

            await service.createUser(mockCreateUser);

            // create не должен вызваться — пользователь уже есть
            expect(mockUserRepository.create).not.toHaveBeenCalled();
        });

        it('логирует ошибку если что-то пошло не так', async () => {
            mockUserRepository.checkExistByParams.mockRejectedValue(new Error('DB error'));

            await service.createUser(mockCreateUser);

            expect(mockLoggerService.error).toHaveBeenCalledTimes(1);
        });
    });
});
