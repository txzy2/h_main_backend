import {Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiOperation, ApiQuery, ApiTags} from '@nestjs/swagger';
import {ApiResponse as SwaggerResponse} from '@nestjs/swagger/dist/decorators/api-response.decorator';
import {ApiResponse} from '@/common';
import {CurrentUser} from '@/common/decorators/current-user.decorator';
import {Roles} from '@/common/decorators/roles.decorator';
import {USER_ROLES} from '@/common/constants/roles.constants';
import {AuthGuard} from '@/guards/auth.guard';
import {RolesGuard} from '@/guards/roles.guard';
import type {AuthUser} from '@/types';
import {DEFAULT_REVENUE_PERIOD} from './dashboard.constants';
import {DashboardService} from './dashboard.service';
import {
    BookingsBoard,
    DashboardSummary,
    ManagerShiftSummary,
    RevenuePeriod
} from './dashboard.types';
import {RevenueQueryDto} from './dto/revenue-query.dto';

@ApiTags('Дашборд')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
export class DashboardController {
    public constructor(private readonly dashboardService: DashboardService) {}

    @ApiOperation({
        summary: 'Сводка для основного дашборда',
        description:
            'KPI, выручка, точки, сотрудники и загрузка по часам для администраторов организации'
    })
    @SwaggerResponse({
        status: 200,
        description: 'Сводка за текущий день/месяц'
    })
    @ApiQuery({
        name: 'refresh',
        required: false,
        type: Boolean,
        description: 'Принудительно пересчитать данные и обновить кэш'
    })
    @SwaggerResponse({status: 401, description: 'Токен недействителен или истёк'})
    @SwaggerResponse({status: 403, description: 'Недостаточно прав'})
    @Get('summary')
    @HttpCode(HttpStatus.OK)
    @Roles(USER_ROLES.ADMIN, USER_ROLES.SUPER_USER)
    @UseGuards(AuthGuard, RolesGuard)
    public async getSummary(
        @CurrentUser() user: AuthUser,
        @Query('refresh') refresh?: string
    ): Promise<ApiResponse> {
        return ApiResponse.ok<DashboardSummary>(
            await this.dashboardService.getSummary(user, this.isRefresh(refresh))
        );
    }

    @ApiOperation({
        summary: 'Брони на сегодня',
        description:
            'Список броней на сегодня: свои брони менеджера идут первыми. Для админа — статистика по сотрудникам.'
    })
    @SwaggerResponse({status: 200, description: 'Список броней и статистика'})
    @SwaggerResponse({status: 401, description: 'Токен недействителен или истёк'})
    @SwaggerResponse({status: 403, description: 'Недостаточно прав'})
    @Get('bookings')
    @HttpCode(HttpStatus.OK)
    @Roles(USER_ROLES.MANAGER, USER_ROLES.ADMIN, USER_ROLES.SUPER_USER)
    @UseGuards(AuthGuard, RolesGuard)
    public async getBookings(@CurrentUser() user: AuthUser): Promise<ApiResponse> {
        return ApiResponse.ok<BookingsBoard>(
            await this.dashboardService.getBookingsBoard(user)
        );
    }

    @ApiOperation({
        summary: 'Серия выручки за период',
        description: 'Точки для графика выручки: сегодня, 14 дней, 1/2/3 месяца'
    })
    @ApiQuery({
        name: 'period',
        required: false,
        enum: ['today', '14d', '1m', '2m', '3m'],
        description: 'Период графика'
    })
    @SwaggerResponse({status: 200, description: 'Серия выручки'})
    @SwaggerResponse({status: 401, description: 'Токен недействителен или истёк'})
    @SwaggerResponse({status: 403, description: 'Недостаточно прав'})
    @Get('revenue')
    @HttpCode(HttpStatus.OK)
    @Roles(USER_ROLES.ADMIN, USER_ROLES.SUPER_USER)
    @UseGuards(AuthGuard, RolesGuard)
    public async getRevenue(
        @CurrentUser() user: AuthUser,
        @Query() query: RevenueQueryDto
    ): Promise<ApiResponse> {
        return ApiResponse.ok<RevenuePeriod>(
            await this.dashboardService.getRevenue(
                user,
                query.period ?? DEFAULT_REVENUE_PERIOD,
                this.isRefresh(query.refresh)
            )
        );
    }

    @ApiOperation({
        summary: 'Сводка смены для дашборда менеджера',
        description: 'Брони, загрузка, личные показатели и сотрудники на смене'
    })
    @SwaggerResponse({status: 200, description: 'Операционная сводка смены'})
    @ApiQuery({
        name: 'refresh',
        required: false,
        type: Boolean,
        description: 'Принудительно пересчитать данные и обновить кэш'
    })
    @SwaggerResponse({status: 401, description: 'Токен недействителен или истёк'})
    @SwaggerResponse({status: 403, description: 'Недостаточно прав'})
    @Get('shift')
    @HttpCode(HttpStatus.OK)
    @Roles(USER_ROLES.MANAGER, USER_ROLES.ADMIN, USER_ROLES.SUPER_USER)
    @UseGuards(AuthGuard, RolesGuard)
    public async getShift(
        @CurrentUser() user: AuthUser,
        @Query('refresh') refresh?: string
    ): Promise<ApiResponse> {
        return ApiResponse.ok<ManagerShiftSummary>(
            await this.dashboardService.getShift(user, this.isRefresh(refresh))
        );
    }

    @ApiOperation({
        summary: 'Выйти на смену',
        description: 'Фиксирует фактическое начало смены менеджера'
    })
    @SwaggerResponse({status: 200, description: 'Смена начата, возвращена сводка'})
    @SwaggerResponse({status: 401, description: 'Токен недействителен или истёк'})
    @SwaggerResponse({status: 403, description: 'Доступно только менеджеру'})
    @Post('shift/start')
    @HttpCode(HttpStatus.OK)
    @Roles(USER_ROLES.MANAGER)
    @UseGuards(AuthGuard, RolesGuard)
    public async startShift(@CurrentUser() user: AuthUser): Promise<ApiResponse> {
        return ApiResponse.ok<ManagerShiftSummary>(
            await this.dashboardService.startShift(user)
        );
    }

    @ApiOperation({
        summary: 'Закончить смену',
        description: 'Фиксирует фактическое окончание смены и возвращает её итоги'
    })
    @SwaggerResponse({status: 200, description: 'Смена завершена, возвращена сводка'})
    @SwaggerResponse({status: 401, description: 'Токен недействителен или истёк'})
    @SwaggerResponse({status: 403, description: 'Доступно только менеджеру'})
    @SwaggerResponse({status: 409, description: 'Смена не была начата'})
    @Post('shift/finish')
    @HttpCode(HttpStatus.OK)
    @Roles(USER_ROLES.MANAGER)
    @UseGuards(AuthGuard, RolesGuard)
    public async finishShift(@CurrentUser() user: AuthUser): Promise<ApiResponse> {
        return ApiResponse.ok<ManagerShiftSummary>(
            await this.dashboardService.finishShift(user)
        );
    }

    private isRefresh(value?: string): boolean {
        return value === '1' || value === 'true';
    }
}
