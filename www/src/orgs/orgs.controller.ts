import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    HttpStatus,
    HttpCode,
    UseGuards
} from '@nestjs/common';
import {OrgsService} from './orgs.service';
import {CreateOrgDto} from './dto/create-org.dto';
import {UpdateOrgDto} from './dto/update-org.dto';
import {ApiResponse} from '@/common';
import {AuthGuard} from '@/guards/auth.guard';
import {CurrentUser} from '@/common/decorators/current-user.decorator';
import {AuthUser} from '@/types';
import {AppLoggerService} from '@/common/logger/logger.service';
import {ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger';
import {ApiResponse as SwaggerResponse} from '@nestjs/swagger/dist/decorators/api-response.decorator';
import {Organization} from '@prisma/client';
import {SUCCESS_CREATED_ORG} from './constants/response.constants';

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
        description: 'Токен недействителен или истёк'
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

    @Get()
    findAll() {
        return this.orgsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.orgsService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateOrgDto: UpdateOrgDto) {
        return this.orgsService.update(+id, updateOrgDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.orgsService.remove(+id);
    }
}
