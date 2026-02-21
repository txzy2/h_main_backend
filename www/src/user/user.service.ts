import {AppLoggerService} from '@/common/logger/logger.service';
import {ConflictException, Inject, Injectable} from '@nestjs/common';
import {Prisma, User} from '@prisma/client';
import {CreateUserDto} from './dto/create-user.dto';
import {USERS_REPOSITORY, type UsersRepositoryInterface} from './user.repository';
import {ApiErrors} from '@/common/errors/api-errors';

@Injectable()
export class UserService {
    public constructor(
        @Inject(USERS_REPOSITORY) private readonly usersRepository: UsersRepositoryInterface,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(UserService.name);
    }

    /**
     * createUser - Создание пользователя
     *
     * @param {CreateUserDto} user
     * @param {Prisma.TransactionClient} tx
     *
     * @returns {Promise<void>}
     */
    public async createUser(user: CreateUserDto, tx?: Prisma.TransactionClient): Promise<void> {
        this.logger.log(
            `Creating user: login=${user.login}, extId=${user.extId}, orgId=${user.orgId}`
        );

        if (await this.checkExistUser({OR: [{login: user.login}, {extId: user.extId}]}, tx)) {
            this.logger.warn(
                `Attempt to create existing user: login=${user.login}, extId=${user.extId}`
            );
            throw new ConflictException({
                message: ApiErrors.USER_ALREADY_EXIST,
                data: {
                    name: user.name,
                    login: user.login
                }
            });
        }

        await this.usersRepository.create(user, tx);
    }

    /**
     * checkExistUser - Проверка существования пользователя
     *
     * @param {Prisma.UserWhereInput} params
     *
     * @returns {Promise<void>}
     */
    public async checkExistUser(
        params: Prisma.UserWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<boolean> {
        this.logger.debug(
            `Checking if user exists by params: keys=${Object.keys(params).join(',')}`
        );
        return !!(await this.usersRepository.checkExistByParams(params, tx));
    }

    /**
     * getUserByParam - Получение пользователя по параметру
     *
     * @param {Prisma.UserWhereInput} param
     * @param {Prisma.TransactionClient} tx?
     *
     * @returns {Promise<User>}
     *
     * @throws {ConflictException}
     */
    public async getUserByParam(
        param: Prisma.UserWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<User> {
        const user = await this.usersRepository.findUserByParam(param, tx);
        if (!user) {
            this.logger.warn(`User not found by param: keys=${Object.keys(param).join(',')}`);
            throw new ConflictException(
                ApiErrors.USER_NOT_FOUND_BY_PARAM(Object.keys(param).join(', '))
            );
        }

        return user;
    }
}
