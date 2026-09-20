import {
    ApiBearerAuth,
    ApiTags,
    ApiOperation,
    ApiResponse as SwaggerResponse
} from '@nestjs/swagger';

import {Body, Controller, HttpCode, HttpStatus, Post, UseGuards} from '@nestjs/common';
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

@ApiTags('Брони')
@ApiBearerAuth('JWT-auth')
@Controller('bookings')
export class BookingsController {
    public constructor(private readonly bookingsService: BookingsService) {}

    @ApiOperation({
        summary: 'Создание брони',
        description: 'Создание брони'
    })
    @SwaggerResponse({
        status: 201,
        description: 'Успешное создание брони',
        example: {
            status: true,
            data: 'string'
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
        return ApiResponse.ok(await this.bookingsService.create(body, user));
    }
}
