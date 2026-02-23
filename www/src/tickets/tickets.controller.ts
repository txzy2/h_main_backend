import {Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards} from '@nestjs/common';
import {TicketsService} from './services';
import {AppLoggerService} from '@/common/logger/logger.service';
import {Roles} from '@/common/decorators/roles.decorator';
import {USER_ROLES} from '@/common/constants/roles.constants';
import {AuthGuard} from '@/guards/auth.guard';
import {RolesGuard} from '@/guards/roles.guard';
import {BaseTicketCreateResponseDto, UpdateOrgTicketRequestDto} from './dto';
import {type AuthUser} from '@/types';
import {ApiResponse} from '@/common';
import {CurrentUser} from '@/common/decorators/current-user.decorator';
import {UpdateOrgTicketUseCase} from './use-case/update-org-ticket';

@Controller('tickets')
export class TicketsController {
    constructor(
        private readonly ticketsService: TicketsService,
        private readonly updateOrgTicketUseCase: UpdateOrgTicketUseCase,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(TicketsController.name);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @Roles(USER_ROLES.SUPER_USER)
    @UseGuards(AuthGuard, RolesGuard)
    public async getAllTickets(@CurrentUser() user: AuthUser): Promise<ApiResponse> {
        this.logger.debugWithMeta('get all Tickets', user);
        //todo
        return ApiResponse.ok();
    }

    @Post('/org/update-request')
    @HttpCode(HttpStatus.ACCEPTED)
    @Roles(USER_ROLES.ADMIN, USER_ROLES.SUPER_USER)
    @UseGuards(AuthGuard, RolesGuard)
    public async UpdateOrgRequest(
        @Body() data: UpdateOrgTicketRequestDto,
        @CurrentUser() user: AuthUser
    ) {
        return ApiResponse.ok<BaseTicketCreateResponseDto>(
            await this.updateOrgTicketUseCase.execute(data, user)
        );
    }
}
