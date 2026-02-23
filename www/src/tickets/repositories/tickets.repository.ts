import {AppLoggerService} from '@/common/logger/logger.service';
import {PrismaService} from '@/prisma/prisma.service';
import {CreateTicketInput} from '@/types';
import {Injectable} from '@nestjs/common';
import {Prisma, Tickets} from '@prisma/client';
import {FilterTicketsRequestQueryDto} from '../dto/get-tickets-filter.dto';

export const TICKETS_REPOSITORY = Symbol('TICKETS_REPOSITORY');

type TicketsWithType = Prisma.TicketsGetPayload<{include: {type: true}}>;

/**
 * Интерфейс репозитория заявок
 */
export interface TicketsRepositoryInterface {
    /**
     * Поиск заявки по параметрам
     * @param {Prisma.TicketsWhereInput} params - Параметры поиска
     * @param {Prisma.TransactionClient} [tx] - Клиент транзакции (опционально)
     * @returns {Promise<Tickets | null>} Найденная заявка или null
     */
    findByParams(
        params: Prisma.TicketsWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<Tickets | null>;

    /**
     * Поиск заявок с ограничением количества
     * @param {FilterTicketsRequestQueryDto} data - Параметры фильтрации и пагинации
     * @param {number} [orgId] - ID организации (опционально)
     * @param {Prisma.TransactionClient} [tx] - Клиент транзакции (опционально)
     * @returns {Promise<TicketsWithType[]>} Массив заявок с типами
     */
    findWithLimits(
        data: FilterTicketsRequestQueryDto,
        orgId?: number,
        tx?: Prisma.TransactionClient
    ): Promise<TicketsWithType[]>;

    /**
     * Создание новой заявки
     * @param {CreateTicketInput} data - Данные для создания заявки
     * @param {Prisma.TransactionClient} [tx] - Клиент транзакции (опционально)
     * @returns {Promise<Tickets | null>} Созданная заявка или null
     */
    create(data: CreateTicketInput, tx?: Prisma.TransactionClient): Promise<Tickets | null>;
}

/**
 * Репозиторий для работы с заявками
 */
@Injectable()
export class TicketsRepository implements TicketsRepositoryInterface {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(TicketsRepository.name);
    }

    /**
     * findByParams - Метод возвращает заявку по выбранным полям или ничего
     *
     * @param {Prisma.TransactionClient} [tx] - Клиент транзакции
     * @param {Prisma.TicketsWhereInput} params - Параметры поиска
     *
     * @returns {Promise<Tickets | null>}
     */
    public async findByParams(
        params: Prisma.TicketsWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<Tickets | null> {
        const client = tx ?? this.prisma;
        return await client.tickets.findFirst({where: params});
    }

    /**
     * Создание новой заявки
     * @param {CreateTicketInput} data - Данные для создания заявки
     * @param {Prisma.TransactionClient} [tx] - Клиент транзакции (опционально)
     * @returns {Promise<Tickets | null>} Созданная заявка или null
     */
    public async create(
        data: CreateTicketInput,
        tx?: Prisma.TransactionClient
    ): Promise<Tickets | null> {
        const client = tx ?? this.prisma;

        const persistenceData: Prisma.TicketsCreateInput = {
            ticketId: data.ticketId,
            requestedData: data.requestedData as Prisma.InputJsonValue,
            reason: data.reason,
            status: data.status,

            organization: {
                connect: {id: data.orgId}
            },
            type: {
                connect: {id: data.typeId}
            }
        };

        return client.tickets.create({
            data: persistenceData
        });
    }

    /**
     * Поиск заявок с ограничением количества (пагинация)
     * @param {FilterTicketsRequestQueryDto} data - Параметры фильтрации и пагинации
     * @param {number} [orgId] - ID организации (опционально)
     * @param {Prisma.TransactionClient} [tx] - Клиент транзакции (опционально)
     * @returns {Promise<TicketsWithType[]>} Массив заявок с типами
     */
    public async findWithLimits(
        data: FilterTicketsRequestQueryDto,
        orgId?: number,
        tx?: Prisma.TransactionClient
    ): Promise<TicketsWithType[]> {
        const client = tx ?? this.prisma;

        this.logger.debugWithMeta('findWithLimits data', {
            data,
            orgId
        });

        return await client.tickets.findMany({
            where: {
                ...(orgId && {orgId})
            },
            include: {type: true},
            take: data.limit,
            skip: data.offset
        });
    }
}
