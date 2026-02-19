import {AppLoggerService} from '@/common/logger/logger.service';
import {ConflictException, Inject, Injectable} from '@nestjs/common';
import {Prisma} from '@prisma/client';
import {CreateUserDto} from './dto/create-user.dto';
import {USERS_REPOSITORY, UsersRepositoryInterface} from './user.repository';

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
        try {
            await this.usersRepository.checkExistByParams(
                {login: user.login, extId: user.extId},
                tx
            );
            await this.usersRepository.create(user, tx);
        } catch (error) {
            this.logger.error(error);
        }
    }

    /**
     * checkExistUser - Проверка существования пользователя
     *
     * @param {Prisma.UserWhereInput} params
     *
     * @returns {Promise<void>}
     */
    private async checkExistUser(params: Prisma.UserWhereInput): Promise<void> {
        const user = await this.usersRepository.checkExistByParams({
            OR: Object.entries(params).map(([key, value]) => ({[key]: value}))
        });

        if (user) {
            throw new ConflictException({
                message: 'Пользователь уже зарегистрирован',
                data: {
                    name: user.name,
                    login: user.login
                }
            });
        }
    }
}
