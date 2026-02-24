import {ConflictException, Inject, Injectable, NotFoundException} from '@nestjs/common';
import {AppLoggerService} from '@/common/logger/logger.service';
import {Prisma, RequestStatus, Tickets} from '@prisma/client';
import {ApiErrors} from '@/common/errors/api-errors';
import {TICKETS_REPOSITORY, type TicketsRepositoryInterface} from '../repositories';
import {FilterTicketResponseDto, UpdateOrgTicketRequestDto} from '../dto';
import {randomUUID} from 'crypto';
import {FilterTicketsRequestQueryDto} from '../dto/get-tickets-filter.dto';
import {OrgsService} from '@/orgs/orgs.service';

/**
 * Сервис для управления заявками
 */
@Injectable()
export class TicketsService {
    public constructor(
        @Inject(TICKETS_REPOSITORY)
        private readonly ticketsRepository: TicketsRepositoryInterface,
        private readonly orgsService: OrgsService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(TicketsService.name);
    }

    /**
     * Получение заявки организации по параметрам или выбрасывание NotFoundException
     *
     * @param {Prisma.TicketsWhereInput} params - Параметры запроса Prisma
     * @param {Prisma.TransactionClient} [tx] - Клиент транзакции (опционально)
     *
     * @returns {Promise<Tickets>} Найденная заявка
     *
     * @throws {NotFoundException} Если заявка не найдена
     */
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

    /**
     * Получение заявки по параметрам
     *
     * @param {Prisma.TicketsWhereInput} params - Параметры запроса Prisma
     * @param {Prisma.TransactionClient} [tx] - Клиент транзакции (опционально)
     *
     * @returns {Promise<Tickets | null>} Найденная заявка или null
     */
    public async getTicketByParams(
        params: Prisma.TicketsWhereInput,
        tx?: Prisma.TransactionClient
    ): Promise<Tickets | null> {
        return await this.ticketsRepository.findByParams(params, tx);
    }

    /**
     * Создание заявки на обновление организации
     *
     * @param {UpdateOrgTicketRequestDto} data - Данные запроса обновления организации
     * @param {number} ticketTypeId - ID типа заявки
     * @param {number} orgId - ID организации
     *
     * @param {Prisma.TransactionClient} [tx] - Клиент транзакции (опционально)
     *
     * @returns {Promise<Tickets>} Созданная заявка
     *
     * @throws {ConflictException} Если создание заявки не удалось
     */
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

    /**
     * Получение списка заявок с пагинацией и фильтрацией
     *
     * @param {FilterTicketsRequestQueryDto} data - Параметры фильтрации и пагинации
     *
     * @returns {Promise<FilterTicketResponseDto[]>} Массив отфильтрованных заявок
     *
     * @throws {NotFoundException} Если заявки не найдены
     */
    public async getQueryTickets(
        data: FilterTicketsRequestQueryDto
    ): Promise<FilterTicketResponseDto[]> {
        let orgId: number | undefined;

        if (data.org_hash) {
            const org = await this.orgsService.ensureOrgExistsByHash(data.org_hash);
            orgId = org.id;
        }

        const tickets = await this.ticketsRepository.findWithLimits(data, orgId);
        if (!tickets.length) {
            throw new NotFoundException(ApiErrors.TICKET_NOT_FOUND);
        }

        return tickets.map(ticket => ({
            ticket_id: ticket.ticketId,
            org_id: ticket.orgId,
            status: ticket.status,
            reason: ticket.reason,
            requested_data: ticket.requestedData,
            type_name: ticket.type.name,
            created_at: ticket.createdAt
        }));
    }
}
