import {ApiResponse} from '@/common';
import {CurrentUser} from '@/common/decorators/current-user.decorator';
import {Roles} from '@/common/decorators/roles.decorator';
import {USER_ROLES} from '@/common/constants/roles.constants';
import {AppLoggerService} from '@/common/logger/logger.service';
import {AuthGuard} from '@/guards/auth.guard';
import {RolesGuard} from '@/guards/roles.guard';
import type {AuthUser} from '@/types';
import {Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger';
import {ApiResponse as SwaggerResponse} from '@nestjs/swagger/dist/decorators/api-response.decorator';
import {Organization} from '@prisma/client';
import {SUCCESS_CREATED_ORG} from './constants/response.constants';
import {CreateOrgDto} from './dto/create-org.dto';
import {OrgsService} from './orgs.service';
import {OrgResponseDto} from './dto/org-info.response.dto';
import {ApiErrors} from '@/common/errors/api-errors';
import {CreateLocationDto} from './dto/create-location.dto';

@ApiTags('Организации')
@ApiBearerAuth('JWT-auth')
@Controller('orgs')
export class OrgsController {
    constructor(
        private readonly orgsService: OrgsService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(OrgsController.name);
    }

    // ======================================================================
    // ============ Общие контроллеры для работы с организациями ============
    // ======================================================================

    // ============ Создание Организации ============

    @ApiOperation({
        summary: 'Регистрация новой организации',
        description: 'Регистрация новой организации'
    })
    @SwaggerResponse({
        status: 201,
        description: 'Успешное создание организации',
        example: {
            status: true,
            data: SUCCESS_CREATED_ORG
        }
    })
    @SwaggerResponse({
        status: 401,
        description: ApiErrors.TOKEN_IS_EXPIRED
    })
    @Post('/register')
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(AuthGuard)
    public async create(
        @Body() createOrgDto: CreateOrgDto,
        @CurrentUser() user: AuthUser
    ): Promise<ApiResponse> {
        this.logger.log(`Регистрация организации: ${createOrgDto.name}`);
        return ApiResponse.ok<Organization>(await this.orgsService.create(createOrgDto, user));
    }

    // ============ Получение информации об организации ============

    @ApiOperation({
        summary: 'Получение организации по пользователю'
    })
    @SwaggerResponse({
        status: 200,
        description: 'Информация об организации и точках пользователя'
    })
    @SwaggerResponse({status: 401, description: ApiErrors.TOKEN_IS_EXPIRED})
    @SwaggerResponse({status: 409, description: ApiErrors.ORG_NOT_FOUND_OR_INACTIVE})
    @Get()
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard)
    public async get(@CurrentUser() user: AuthUser): Promise<ApiResponse> {
        this.logger.log(`Попытка получить организацию от ${user.sub}`);
        return ApiResponse.ok<OrgResponseDto>(await this.orgsService.getOrgInfo(user));
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
    @Post('/locations/add')
    @HttpCode(HttpStatus.ACCEPTED)
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(USER_ROLES.ADMIN, USER_ROLES.SUPER_USER)
    public async createLocation(
        @CurrentUser() user: AuthUser,
        @Body() locations: CreateLocationDto
    ): Promise<ApiResponse> {
        this.logger.log(`Add Locations request by ${user.sub}`);
        await this.orgsService.addLocationForOrg(locations, user);
        return ApiResponse.ok<string>('Точки добавлены');
    }
}
