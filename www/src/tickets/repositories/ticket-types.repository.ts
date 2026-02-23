import {AppLoggerService} from '@/common/logger/logger.service';
import {PrismaService} from '@/prisma/prisma.service';
import {Injectable} from '@nestjs/common';
import {Prisma, TicketType} from '@prisma/client';

export const TICKET_TYPES_REPOSITORY = Symbol('TICKET_TYPES_REPOSITORY');

export interface TicketTypesRepositoryInterface {
    getTicketTypeByParam(
        params: Prisma.TicketTypeWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<TicketType | null>;
}

@Injectable()
export class TicketTypesRepository implements TicketTypesRepositoryInterface {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(TicketTypesRepository.name);
    }

    public async getTicketTypeByParam(
        params: Prisma.TicketTypeWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<TicketType | null> {
        const client = tx ?? this.prisma;
        return await client.ticketType.findFirst({where: params});
    }
}
