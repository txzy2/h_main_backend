import {ApiResponse} from '@/common';
import {CurrentUser} from '@/common/decorators/current-user.decorator';
import {AppLoggerService} from '@/common/logger/logger.service';
import {AuthGuard} from '@/guards/auth.guard';
import type {AuthUser} from '@/types';
import {Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger';
import {ApiResponse as SwaggerResponse} from '@nestjs/swagger/dist/decorators/api-response.decorator';
import {Organization} from '@prisma/client';
import {SUCCESS_CREATED_ORG} from './constants/response.constants';
import {CreateOrgDto, OrgResponseDto} from './dto';
import {ApiErrors} from '@/common/errors/api-errors';
import {CreateOrgUseCase} from './use-cases/create-org.use-case';
import {OrgsService} from './orgs.service';

@ApiTags('Организации')
@ApiBearerAuth('JWT-auth')
@Controller('orgs')
export class OrgsController {
    constructor(
        private readonly orgsService: OrgsService,
        private readonly createOrgUseCase: CreateOrgUseCase,
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
        return ApiResponse.ok<Organization>(
            await this.createOrgUseCase.execute(createOrgDto, user)
        );
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

    // ============ Заявка на обновление организации ============

    // ============ Обновление организации (только для СуперПользователей) ============

    // @Patch('/update')
    // @HttpCode(HttpStatus.OK)
    // @Roles(USER_ROLES.SUPER_USER)
    // @UseGuards(AuthGuard, RolesGuard)
    // public async update(
    //     @Body() updateOrgDto: UpdateOrgDto,
    //     @CurrentUser() user: AuthUser
    // ): Promise<ApiResponse> {
    //     this.logger.log(`Обновление организации от ${user.sub}`);
    //     return ApiResponse.ok<Organization>(await this.orgsService.update(updateOrgDto, user));
    // }
}
