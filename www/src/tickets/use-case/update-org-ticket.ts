import {ConflictException, Injectable} from '@nestjs/common';
import {BaseTicketCreateResponseDto, UpdateOrgTicketRequestDto} from '../dto';
import {OrgsService} from '@/orgs/orgs.service';
import {AppLoggerService} from '@/common/logger/logger.service';
import {AuthUser} from '@/types';
import {TicketsService, TicketTypesService} from '../services';
import {ApiErrors} from '@/common/errors/api-errors';

@Injectable()
export class UpdateOrgTicketUseCase {
    public constructor(
        private readonly orgsService: OrgsService,
        private readonly ticketsService: TicketsService,
        private readonly ticketTypesService: TicketTypesService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(UpdateOrgTicketUseCase.name);
    }
    public async execute(
        data: UpdateOrgTicketRequestDto,
        user: AuthUser
    ): Promise<BaseTicketCreateResponseDto> {
        const existOrg = await this.orgsService.ensureOrgExistsByHash(data.org_hash);
        await this.orgsService.ensureUserBelongsToOrgOrThrow(user.sub, existOrg.id);

        const ticketType = await this.ticketTypesService.getTicketTypeByParamsOrThrow({
            alias: 'org.update'
        });

        if (
            await this.ticketsService.getTicketByParams({
                AND: [{orgId: existOrg.id}, {typeId: ticketType.id}]
            })
        ) {
            throw new ConflictException(ApiErrors.TICKET_ALREADY_EXIST);
        }
        const newTicket = await this.ticketsService.createUpdateOrgTicket(
            data,
            ticketType.id,
            existOrg.id
        );

        return {
            ticket_id: newTicket.ticketId,
            message: 'Заявка на обновление организации успешно создана'
        };
    }
}
