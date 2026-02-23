import {ConflictException, Inject, Injectable, NotFoundException} from '@nestjs/common';
import {AppLoggerService} from '@/common/logger/logger.service';
import {Prisma, RequestStatus, Tickets} from '@prisma/client';
import {ApiErrors} from '@/common/errors/api-errors';
import {TICKETS_REPOSITORY, type TicketsRepositoryInterface} from '../repositories';
import {UpdateOrgTicketRequestDto} from '../dto';
import {randomUUID} from 'crypto';

@Injectable()
export class TicketsService {
    public constructor(
        @Inject(TICKETS_REPOSITORY)
        private readonly ticketsRepository: TicketsRepositoryInterface,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(TicketsService.name);
    }

    public async getOrgRequestTicketByParamsOrThrow(
        params: Prisma.TicketsWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<Tickets> {
        const ticket = await this.ticketsRepository.findByParams(params, tx);
        if (!ticket) {
            throw new NotFoundException(ApiErrors.TICKET_NOT_FOUND);
        }

        return ticket;
    }

    public async getTicketByParams(
        params: Prisma.TicketsWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<Tickets | null> {
        return await this.ticketsRepository.findByParams(params, tx);
    }

    public async createUpdateOrgTicket(
        data: UpdateOrgTicketRequestDto,
        ticketTypeId: number,
        orgId: number,
        tx?: Prisma.TransactionClient
    ): Promise<Tickets> {
        const newTicket = await this.ticketsRepository.create(
            {
                ticketId: randomUUID(),
                orgId,
                typeId: ticketTypeId,
                requestedData: data.data,
                reason: data.reason,
                status: RequestStatus.Pending
            },
            tx
        );
        if (!newTicket) {
            throw new ConflictException(ApiErrors.TICKET_ERROR_CREATE);
        }

        return newTicket;
    }
}
