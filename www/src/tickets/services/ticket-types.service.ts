import {Inject, Injectable, NotFoundException} from '@nestjs/common';
import {TICKET_TYPES_REPOSITORY, type TicketTypesRepositoryInterface} from '../repositories';
import {AppLoggerService} from '@/common/logger/logger.service';
import {Prisma, TicketType} from '@prisma/client';
import {ApiErrors} from '@/common/errors/api-errors';

@Injectable()
export class TicketTypesService {
    public constructor(
        @Inject(TICKET_TYPES_REPOSITORY)
        private readonly ticketTypesRepository: TicketTypesRepositoryInterface,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(TicketTypesService.name);
    }

    public async getTicketTypeByParamsOrThrow(
        params: Prisma.TicketTypeWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<TicketType> {
        const ticketType = await this.ticketTypesRepository.getTicketTypeByParam(params, tx);
        if (!ticketType) {
            throw new NotFoundException(ApiErrors.TICKET_TYPE_NOT_FOUND);
        }
        return ticketType;
    }
}
