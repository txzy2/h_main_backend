import {forwardRef, Module} from '@nestjs/common';
import {
    TICKET_TYPES_REPOSITORY,
    TICKETS_REPOSITORY,
    TicketsRepository,
    TicketTypesRepository
} from './repositories';
import {TicketsController} from './tickets.controller';
import {TicketsService, TicketTypesService} from './services';
import {UpdateOrgTicketUseCase} from './use-case/update-org-ticket.use-case';
import {OrgsModule} from '@/orgs/orgs.module';
import {PrismaModule} from '@/prisma/prisma.module';

@Module({
    imports: [forwardRef(() => OrgsModule), PrismaModule],
    controllers: [TicketsController],
    providers: [
        TicketsService,
        TicketTypesService,
        UpdateOrgTicketUseCase,
        {provide: TICKETS_REPOSITORY, useClass: TicketsRepository},
        {provide: TICKET_TYPES_REPOSITORY, useClass: TicketTypesRepository}
    ],
    exports: [TicketsService, TicketTypesService]
})
export class TicketsModule {}
