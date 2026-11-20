import {ApiPropertyOptional} from '@nestjs/swagger';
import {Activity} from '@prisma/client';
import {
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPhoneNumber,
    IsString,
    Max,
    MaxLength,
    Min
} from 'class-validator';

export class UpdateLocationDto {
    @ApiPropertyOptional({description: 'Название точки', example: 'Центральный офис'})
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({description: 'Адрес точки'})
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    address?: string;

    @ApiPropertyOptional({description: 'Телефон точки', example: '79170000000'})
    @IsOptional()
    @IsString()
    @IsPhoneNumber('RU')
    @MaxLength(11)
    phone?: string;

    @ApiPropertyOptional({
        description: 'Количество активных мест',
        example: 10,
        minimum: 1,
        maximum: 50
    })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(50)
    active_places?: number;

    @ApiPropertyOptional({
        description: 'Статус точки',
        enum: ['Active', 'Inactive', 'Pending', 'Closed']
    })
    @IsOptional()
    @IsIn(Object.values(Activity))
    status?: Activity;
}
