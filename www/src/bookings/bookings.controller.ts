import {
    ApiBearerAuth,
    ApiTags,
    ApiOperation,
    ApiResponse as SwaggerResponse
} from '@nestjs/swagger';

import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    UseGuards
} from '@nestjs/common';
import {BookingsService} from './bookings.service';
import {ApiResponse} from '@/common';
import {CreateBookingDto} from './dto/create-booking.dto';
import {CurrentUser} from '@/common/decorators/current-user.decorator';
import {type AuthUser} from '@/types';
import {AuthGuard} from '@/guards/auth.guard';

import {USER_ROLES} from '@/common/constants/roles.constants';
import {Roles} from '@/common/decorators/roles.decorator';
import {RolesGuard} from '@/guards/roles.guard';
import {ApiErrors} from '@/common/errors/api-errors';
import {CreateBookingUseCase} from './use-cases/create-booking.use-case';
import {Booking} from '@prisma/client';
import {BookingDetailsDto} from './bookings.types';
import {ExtendBookingDto} from './dto/extend-booking.dto';
import {CloseBookingDto} from './dto/close-booking.dto';
import {CancelBookingDto} from './dto/cancel-booking.dto';

@ApiTags('Брони')
@ApiBearerAuth('JWT-auth')
@Controller('bookings')
export class BookingsController {
    public constructor(
        private readonly bookingCreateUseCase: CreateBookingUseCase,
        private readonly bookingsService: BookingsService
    ) {}

    @ApiOperation({
        summary: 'Создание брони',
        description: 'Создаёт бронь. Доступно только роли Manager.'
    })
    @SwaggerResponse({
        status: 200,
        description: 'Успешное создание брони',
        example: {
            success: true,
            data: {
                id: 1,
                locationId: 1,
                tableId: 3,
                guestName: 'Иван Иванов',
                guestsCount: 4,
                status: 'Confirmed',
                scheduledAt: '2026-11-13T19:00:00.000Z'
            }
        }
    })
    @SwaggerResponse({
        status: 401,
        description: ApiErrors.TOKEN_IS_EXPIRED
    })
    @Post('/create')
    @HttpCode(HttpStatus.OK)
    @Roles(USER_ROLES.MANAGER)
    @UseGuards(AuthGuard, RolesGuard)
    public async create(
        @Body() body: CreateBookingDto,
        @CurrentUser() user: AuthUser
    ): Promise<ApiResponse> {
        return ApiResponse.ok<Booking>(await this.bookingCreateUseCase.execute(body, user));
    }

    @ApiOperation({
        summary: 'Детали брони',
        description: 'Детали брони и история действий. Доступно только роли Manager.'
    })
    @SwaggerResponse({status: 200, description: 'Детали брони'})
    @SwaggerResponse({status: 404, description: ApiErrors.BOOKING_NOT_FOUND})
    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @Roles(USER_ROLES.MANAGER, USER_ROLES.ADMIN, USER_ROLES.SUPER_USER)
    @UseGuards(AuthGuard, RolesGuard)
    public async getDetails(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: AuthUser
    ): Promise<ApiResponse> {
        return ApiResponse.ok<BookingDetailsDto>(
            await this.bookingsService.getDetails(id, user)
        );
    }

    @ApiOperation({
        summary: 'Начать визит',
        description: 'Фиксирует приход гостя (seatedAt). Только для своей брони.'
    })
    @SwaggerResponse({status: 200, description: 'Визит начат'})
    @SwaggerResponse({status: 403, description: ApiErrors.BOOKING_NOT_OWNED})
    @SwaggerResponse({status: 409, description: ApiErrors.BOOKING_ALREADY_STARTED})
    @Patch(':id/start')
    @HttpCode(HttpStatus.OK)
    @Roles(USER_ROLES.MANAGER)
    @UseGuards(AuthGuard, RolesGuard)
    public async start(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: AuthUser
    ): Promise<ApiResponse> {
        return ApiResponse.ok<BookingDetailsDto>(
            await this.bookingsService.start(id, user)
        );
    }

    @ApiOperation({
        summary: 'Продлить бронь',
        description: 'Увеличивает длительность брони. Только для своей брони.'
    })
    @SwaggerResponse({status: 200, description: 'Бронь продлена'})
    @SwaggerResponse({status: 403, description: ApiErrors.BOOKING_NOT_OWNED})
    @SwaggerResponse({status: 409, description: ApiErrors.BOOKING_TABLE_BUSY})
    @Patch(':id/extend')
    @HttpCode(HttpStatus.OK)
    @Roles(USER_ROLES.MANAGER)
    @UseGuards(AuthGuard, RolesGuard)
    public async extend(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: ExtendBookingDto,
        @CurrentUser() user: AuthUser
    ): Promise<ApiResponse> {
        return ApiResponse.ok<BookingDetailsDto>(
            await this.bookingsService.extend(id, body, user)
        );
    }

    @ApiOperation({
        summary: 'Закрыть бронь',
        description: 'Завершает бронь, фиксирует сумму чека и комментарий.'
    })
    @SwaggerResponse({status: 200, description: 'Бронь закрыта'})
    @SwaggerResponse({status: 403, description: ApiErrors.BOOKING_NOT_OWNED})
    @SwaggerResponse({status: 409, description: ApiErrors.BOOKING_ALREADY_CLOSED})
    @Patch(':id/close')
    @HttpCode(HttpStatus.OK)
    @Roles(USER_ROLES.MANAGER)
    @UseGuards(AuthGuard, RolesGuard)
    public async close(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: CloseBookingDto,
        @CurrentUser() user: AuthUser
    ): Promise<ApiResponse> {
        return ApiResponse.ok<BookingDetailsDto>(
            await this.bookingsService.close(id, body, user)
        );
    }

    @ApiOperation({
        summary: 'Отменить бронь',
        description: 'Отменяет бронь с обязательной причиной отмены.'
    })
    @SwaggerResponse({status: 200, description: 'Бронь отменена'})
    @SwaggerResponse({status: 403, description: ApiErrors.BOOKING_NOT_OWNED})
    @SwaggerResponse({status: 409, description: ApiErrors.BOOKING_ALREADY_CANCELLED})
    @Patch(':id/cancel')
    @HttpCode(HttpStatus.OK)
    @Roles(USER_ROLES.MANAGER)
    @UseGuards(AuthGuard, RolesGuard)
    public async cancel(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: CancelBookingDto,
        @CurrentUser() user: AuthUser
    ): Promise<ApiResponse> {
        return ApiResponse.ok<BookingDetailsDto>(
            await this.bookingsService.cancel(id, body, user)
        );
    }
}
