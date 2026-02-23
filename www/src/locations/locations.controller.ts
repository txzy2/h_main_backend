import {Body, Controller, HttpCode, HttpStatus, Post, UseGuards} from '@nestjs/common';
import {LocationsService} from './locations.service';
import {ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger';
import {AuthGuard} from '@/guards/auth.guard';
import {RolesGuard} from '@/guards/roles.guard';
import {ApiResponse as SwaggerResponse} from '@nestjs/swagger/dist/decorators/api-response.decorator';
import {USER_ROLES} from '@/common/constants/roles.constants';
import {Roles} from '@/common/decorators/roles.decorator';
import {CurrentUser} from '@/common/decorators/current-user.decorator';
import {CreateLocationDto} from './dto/create-location.dto';
import {AppLoggerService} from '@/common/logger/logger.service';
import {ApiErrors} from '@/common/errors/api-errors';
import {type AuthUser} from '@/types';
import {ApiResponse} from '@/common';

@ApiTags('Точки организаций')
@ApiBearerAuth('JWT-auth')
@Controller('locations')
export class LocationsController {
    public constructor(
        private readonly locationsService: LocationsService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(LocationsController.name);
    }

    // ======================================================================
    // ======= Общие контроллеры для работы с локациями организации =========
    // ======================================================================

    // ================ Добавление точек для организации ================

    @ApiOperation({summary: 'Добавление точек для организации'})
    @SwaggerResponse({status: 202, description: 'Точки успешно добавлены'})
    @SwaggerResponse({status: 401, description: ApiErrors.TOKEN_IS_EXPIRED})
    @SwaggerResponse({status: 403, description: ApiErrors.ACCESS_DENIED})
    @SwaggerResponse({status: 409, description: ApiErrors.USER_NOT_FOUND})
    @Post('/add')
    @HttpCode(HttpStatus.ACCEPTED)
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(USER_ROLES.ADMIN, USER_ROLES.SUPER_USER)
    public async createLocation(
        @CurrentUser() user: AuthUser,
        @Body() locations: CreateLocationDto
    ): Promise<ApiResponse> {
        this.logger.log(`Add Locations request by ${user.sub}`);
        await this.locationsService.addLocationForOrg(locations, user);
        return ApiResponse.ok<string>('Точки добавлены');
    }
}
