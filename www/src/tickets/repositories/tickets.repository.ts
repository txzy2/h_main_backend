import {AppLoggerService} from '@/common/logger/logger.service';
import {PrismaService} from '@/prisma/prisma.service';
import {CreateTicketInput} from '@/types';
import {Injectable} from '@nestjs/common';
import {Prisma, Tickets} from '@prisma/client';

export const TICKETS_REPOSITORY = Symbol('TICKETS_REPOSITORY');

export interface TicketsRepositoryInterface {
    findByParams(
        params: Prisma.TicketsWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<Tickets | null>;

    create(data: CreateTicketInput, tx?: Prisma.TransactionClient): Promise<Tickets | null>;
}

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
     * @param {Prisma.TransactionClient} tx?
     * @param {Prisma.TicketsWhereInput} params
     *
     * @returns {Promise<Tickets | null}
     */
    public async findByParams(
        params: Prisma.TicketsWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<Tickets | null> {
        const client = tx ?? this.prisma;
        return await client.tickets.findFirst({where: params});
    }

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
}
