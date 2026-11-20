import {ApiPropertyOptional} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {IsIn, IsInt, IsOptional, IsString, Max, Min} from 'class-validator';
import {TEAM_SORT_KEYS, type TeamSortKey} from '../dashboard.types';

export class TeamQueryDto {
    @ApiPropertyOptional({description: 'Номер страницы', default: 1, minimum: 1})
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({
        description: 'Размер страницы',
        default: 10,
        minimum: 1,
        maximum: 100
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    pageSize?: number;

    @ApiPropertyOptional({description: 'Поиск по имени, логину, телефону или должности'})
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({enum: TEAM_SORT_KEYS, default: 'name'})
    @IsOptional()
    @IsIn(TEAM_SORT_KEYS)
    sort?: TeamSortKey;

    @ApiPropertyOptional({enum: ['asc', 'desc'], default: 'asc'})
    @IsOptional()
    @IsIn(['asc', 'desc'])
    order?: 'asc' | 'desc';
}
