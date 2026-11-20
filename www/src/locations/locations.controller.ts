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
    Put,
    UseGuards
} from '@nestjs/common';
import {LocationsService} from './locations.service';
import {ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger';
import {AuthGuard} from '@/guards/auth.guard';
import {RolesGuard} from '@/guards/roles.guard';
import {ApiResponse as SwaggerResponse} from '@nestjs/swagger/dist/decorators/api-response.decorator';
import {USER_ROLES} from '@/common/constants/roles.constants';
import {Roles} from '@/common/decorators/roles.decorator';
import {CurrentUser} from '@/common/decorators/current-user.decorator';
import {CreateLocationDto} from './dto/create-location.dto';
import {SaveFloorPlanDto} from './dto/save-floor-plan.dto';
import {UpdateLocationDto} from './dto/update-location.dto';
import {FloorPlanResponse} from './floor-plan.types';
import {Location} from '@prisma/client';
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
        //TODO: Сделать передачу кол-ва столиков у точки
        await this.locationsService.addLocationForOrg(locations, user);
        return ApiResponse.ok<string>('Точки добавлены');
    }

    @ApiOperation({summary: 'Редактирование точки'})
    @SwaggerResponse({status: 200, description: 'Точка обновлена'})
    @SwaggerResponse({status: 401, description: ApiErrors.TOKEN_IS_EXPIRED})
    @SwaggerResponse({status: 403, description: ApiErrors.ACCESS_DENIED})
    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(USER_ROLES.ADMIN, USER_ROLES.SUPER_USER)
    public async updateLocation(
        @CurrentUser() user: AuthUser,
        @Param('id', ParseIntPipe) id: number,
        @Body() body: UpdateLocationDto
    ): Promise<ApiResponse> {
        return ApiResponse.ok<Location>(
            await this.locationsService.updateLocation(user, id, body)
        );
    }

    // ================ План зала ================

    @ApiOperation({summary: 'Получение плана зала точки'})
    @SwaggerResponse({status: 200, description: 'JSON-лейаут плана зала'})
    @SwaggerResponse({status: 401, description: ApiErrors.TOKEN_IS_EXPIRED})
    @SwaggerResponse({status: 403, description: ApiErrors.ACCESS_DENIED})
    @Get(':id/floor-plan')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(USER_ROLES.ADMIN, USER_ROLES.SUPER_USER)
    public async getFloorPlan(
        @CurrentUser() user: AuthUser,
        @Param('id', ParseIntPipe) id: number
    ): Promise<ApiResponse> {
        return ApiResponse.ok<FloorPlanResponse>(
            await this.locationsService.getFloorPlan(user, id)
        );
    }

    @ApiOperation({summary: 'Сохранение плана зала точки'})
    @SwaggerResponse({status: 200, description: 'План зала сохранён'})
    @SwaggerResponse({status: 400, description: 'Некорректный лейаут'})
    @SwaggerResponse({status: 401, description: ApiErrors.TOKEN_IS_EXPIRED})
    @SwaggerResponse({status: 403, description: ApiErrors.ACCESS_DENIED})
    @Put(':id/floor-plan')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(USER_ROLES.ADMIN, USER_ROLES.SUPER_USER)
    public async saveFloorPlan(
        @CurrentUser() user: AuthUser,
        @Param('id', ParseIntPipe) id: number,
        @Body() body: SaveFloorPlanDto
    ): Promise<ApiResponse> {
        return ApiResponse.ok<FloorPlanResponse>(
            await this.locationsService.saveFloorPlan(user, id, body)
        );
    }
}
