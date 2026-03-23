import {Injectable, NotFoundException} from '@nestjs/common';
import {OrgsService} from '../orgs.service';
import {UpdateOrgDto} from '../dto';
import {ApiErrors} from '@/common/errors/api-errors';
import {TicketsService} from '@/tickets/services';
import {AppLoggerService} from '@/common/logger/logger.service';
import {RequestStatus} from '@prisma/client';
import {InjectQueue} from '@nestjs/bullmq';
import {Queue} from 'bullmq';
import {CommonHttpService} from '@/common/http/http.service';
import {ConfigService} from '@nestjs/config';

@Injectable()
export class UpdateOrgUseCase {
    public constructor(
        private readonly orgsService: OrgsService,
        private readonly ticketsService: TicketsService,
        private readonly logger: AppLoggerService,
        private readonly httpService: CommonHttpService,
        private readonly configService: ConfigService,
        @InjectQueue('update-org')
        private readonly updateOrgQueue: Queue
    ) {}

    /**
     * Выполнение use-case обновления организации
     *
     * @param {UpdateOrgDto} dto - DTO с данными для обновления организации
     * @param {AuthUser} user - Авторизованный пользователь
     *
     * @returns {Promise<string>} Строка с результатом выполнения use-case (always "Орагнизация обновлена")
     *
     * @throws {NotFoundException} Если организация не найдена или неактивна
     * @throws {NotFoundException} Если заявка не найдена
     */
    public async execute(dto: UpdateOrgDto): Promise<string> {
        // Проверяем существование организации
        const existOrg = await this.orgsService.ensureOrgExistsByHash(dto.hash);
        if (!existOrg) {
            this.logger.log(`Организация ${dto.hash} не найдена`);
            throw new NotFoundException(ApiErrors.ORG_NOT_FOUND_OR_INACTIVE);
        }

        // Проверяем существование заявки (По идентификатору + статус + организация)
        const existTicket = await this.ticketsService.getTicketByParams({
            AND: [
                {orgId: existOrg.id},
                {ticketId: {contains: dto.ticket_id}},
                {status: RequestStatus.Pending}
            ]
        });
        if (!existTicket) {
            this.logger.warn(`Заявка не найдена\nDATA: ${JSON.stringify(dto)}`);
            throw new NotFoundException(ApiErrors.TICKET_NOT_FOUND);
        }

        // Обновляем организацию
        await this.orgsService.updateOrgOrThrow(dto);
        // Обновляем статус заявки
        //TODO: Добавить кто проверил (reviewedByExtId)
        await this.ticketsService.updateStatus(existTicket.ticketId, RequestStatus.Approved);

        //TODO: Сделать очередь на отправку уведомления на почту пользователя (Отправляем только админам организации)
        await this.updateOrgQueue.add('update-org', {
            email: existTicket.email as string,
            updatedData: existTicket.requestedData,
            type: 'updateOrg'
        });

        this.logger.log(`Организация обновлена\nDATA: ${JSON.stringify(dto)}`);

        return 'Орагнизация обновлена';
    }
}
