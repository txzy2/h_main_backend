import {AppLoggerService} from '@/common/logger/logger.service';
import {PrismaService} from '@/prisma/prisma.service';
import {Injectable} from '@nestjs/common';
import {Prisma, TicketType} from '@prisma/client';

export const TICKET_TYPES_REPOSITORY = Symbol('TICKET_TYPES_REPOSITORY');

/**
 * Интерфейс репозитория типов заявок
 */
export interface TicketTypesRepositoryInterface {
    /**
     * Получение типа заявки по параметрам
     * @param {Prisma.TicketTypeWhereInput} params - Параметры поиска
     * @param {Prisma.TransactionClient} [tx] - Клиент транзакции (опционально)
     * @returns {Promise<TicketType | null>} Найденный тип заявки или null
     */
    getTicketTypeByParam(
        params: Prisma.TicketTypeWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<TicketType | null>;
}

/**
 * Репозиторий для работы с типами заявок
 */
@Injectable()
export class TicketTypesRepository implements TicketTypesRepositoryInterface {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(TicketTypesRepository.name);
    }

    /**
     * Получение типа заявки по параметрам
     * @param {Prisma.TicketTypeWhereInput} params - Параметры поиска
     * @param {Prisma.TransactionClient} [tx] - Клиент транзакции (опционально)
     * @returns {Promise<TicketType | null>} Найденный тип заявки или null
     */
    public async getTicketTypeByParam(
        params: Prisma.TicketTypeWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<TicketType | null> {
        const client = tx ?? this.prisma;
        return await client.ticketType.findFirst({where: params});
    }
}
