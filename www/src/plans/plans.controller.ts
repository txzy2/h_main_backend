import {Controller, Get, HttpCode, HttpStatus} from '@nestjs/common';
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger';
import {PlansService} from './plans.service';
import {ApiResponse} from '@/common';
import {Plans} from '@prisma/client';

@ApiTags('Планы')
@ApiBearerAuth('JWT-auth')
@Controller('plans')
export class PlansController {
    public constructor(private readonly plansService: PlansService) {}

    @HttpCode(HttpStatus.OK)
    @Get('/')
    public async getPlans(): Promise<ApiResponse> {
        return ApiResponse.ok<Plans[]>(await this.plansService.getPlans());
    }
}
