import {Injectable} from '@nestjs/common';
import {CreateUserDto} from './dto/create-user.dto';
import {PrismaService} from '@/infrastructure/prisma/prisma.service';
import {AppLoggerService} from '@/common/logger/logger.service';
import {Prisma, User} from '@prisma/client';

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export interface UsersRepositoryInterface {
    checkExistByParams(
        param: Prisma.UserWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<User | null>;

    findUserByParam(
        param: Prisma.UserWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<User | null>;

    create(user: CreateUserDto, tx?: Prisma.TransactionClient): Promise<void>;
}

@Injectable()
export class UsersRepository implements UsersRepositoryInterface {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(UsersRepository.name);
    }

    /**
     * create - Создание пользователя
     *
     * @param {CreateUserDto} user
     * @param {Prisma.TransactionClient} tx
     *
     * @returns {Promise<void>}
     */
    public async create(user: CreateUserDto, tx?: Prisma.TransactionClient): Promise<void> {
        const client = tx ?? this.prisma;
        await client.user.create({
            data: {
                name: user.name,
                login: user.login,
                phoneNumber: user.phoneNumber,
                extId: user.extId,
                orgId: user.orgId
            }
        });
    }

    /**
     * checkExistByParams - Проверка существования пользователя
     *
     * @param {Prisma.UserWhereInput} param - параметры поиска
     * @param {Prisma.TransactionClient} tx - транзакция
     *
     * @returns {Promise<User | null>}
     */
    public async checkExistByParams(
        param: Prisma.UserWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<User | null> {
        const client = tx ?? this.prisma;
        return await client.user.findFirst({where: param});
    }

    /**
     * findUserByParam - Поиск пользователя по переданному параметру
     *
     * @param {Prisma.UserWhereInput} param - параметр поиска
     * @param {Prisma.TransactionClient} tx - транзакция
     *
     * @returns {Promise<User | null>} - найденный пользователь или null, если пользователь не найден
     */
    public async findUserByParam(
        param: Prisma.UserWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<User | null> {
        const client = tx ?? this.prisma;
        return await client.user.findFirst({
            where: {
                ...param
            }
        });
    }
}
