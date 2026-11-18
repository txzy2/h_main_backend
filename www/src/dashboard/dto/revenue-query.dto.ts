import {ApiPropertyOptional} from '@nestjs/swagger';
import {IsIn, IsOptional, IsString} from 'class-validator';
import {
    DEFAULT_REVENUE_PERIOD,
    REVENUE_PERIOD_KEYS,
    type RevenuePeriodKey
} from '../dashboard.constants';

export class RevenueQueryDto {
    @ApiPropertyOptional({
        description: 'Период графика выручки',
        enum: REVENUE_PERIOD_KEYS,
        default: DEFAULT_REVENUE_PERIOD
    })
    @IsOptional()
    @IsIn(REVENUE_PERIOD_KEYS)
    period?: RevenuePeriodKey;

    @ApiPropertyOptional({
        description: 'Принудительно пересчитать данные и обновить кэш (1/true)'
    })
    @IsOptional()
    @IsString()
    refresh?: string;
}
