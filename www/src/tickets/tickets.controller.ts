import {Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards} from '@nestjs/common';
import {TicketsService} from './services';
import {AppLoggerService} from '@/common/logger/logger.service';
import {Roles} from '@/common/decorators/roles.decorator';
import {USER_ROLES} from '@/common/constants/roles.constants';
import {AuthGuard} from '@/guards/auth.guard';
import {RolesGuard} from '@/guards/roles.guard';
import {
    BaseTicketCreateResponseDto,
    FilterTicketResponseDto,
    UpdateOrgTicketRequestDto
} from './dto';
import {type AuthUser} from '@/types';
import {ApiResponse} from '@/common';
import {CurrentUser} from '@/common/decorators/current-user.decorator';
import {UpdateOrgTicketUseCase} from './use-case/update-org-ticket.use-case';
import {FilterTicketsRequestQueryDto} from './dto/get-tickets-filter.dto';
import {
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags
} from '@nestjs/swagger';
import {
    CREATE_ORG_TICKET_RESPONSE_EXAMPLE,
    SUCCESS_GET_TICKETS_RESPONSE
} from './constants/response.constants';

@Controller('tickets')
@ApiTags('tickets')
@ApiBearerAuth()
export class TicketsController {
    constructor(
        private readonly ticketsService: TicketsService,
        private readonly updateOrgTicketUseCase: UpdateOrgTicketUseCase,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(TicketsController.name);
    }

    @Get('query')
    @HttpCode(HttpStatus.OK)
    @Roles(USER_ROLES.SUPER_USER)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({summary: 'Фильтрация заявок с пагинацией'})
    @ApiOkResponse({
        description: 'Заявки успешно получены',
        type: FilterTicketResponseDto,
        example: SUCCESS_GET_TICKETS_RESPONSE
    })
    public async filter(@Query() queryParams: FilterTicketsRequestQueryDto): Promise<ApiResponse> {
        return ApiResponse.ok<FilterTicketResponseDto[]>(
            await this.ticketsService.getQueryTickets(queryParams)
        );
    }

    @Post('/org/update-request')
    @HttpCode(HttpStatus.CREATED)
    @Roles(USER_ROLES.ADMIN, USER_ROLES.SUPER_USER)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({summary: 'Создание заявки на обновление организации'})
    @ApiCreatedResponse({
        description: 'Заявка на обновление организации успешно создана',
        type: BaseTicketCreateResponseDto,
        example: CREATE_ORG_TICKET_RESPONSE_EXAMPLE
    })
    public async UpdateOrgRequest(
        @Body() data: UpdateOrgTicketRequestDto,
        @CurrentUser() user: AuthUser
    ) {
        return ApiResponse.ok<BaseTicketCreateResponseDto>(
            await this.updateOrgTicketUseCase.execute(data, user)
        );
    }
}
