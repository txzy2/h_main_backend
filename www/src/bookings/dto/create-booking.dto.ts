import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {
    IsInt,
    IsISO8601,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    Max,
    MaxLength,
    Min
} from 'class-validator';

export class CreateBookingDto {
    @ApiProperty({
        name: 'location_id',
        description: 'Уникальный идентификатор точки',
        required: true,
        example: 1
    })
    @IsInt()
    @Min(1)
    locationId!: number;

    @ApiProperty({
        name: 'org_id',
        description: 'Уникальный идентификатор организации',
        required: true,
        example: 1
    })
    @IsInt()
    @Min(1)
    orgId!: number;

    @ApiPropertyOptional({
        name: 'table_id',
        description: 'Идентификатор стола. Если не указан — будет выбран свободный',
        example: 3
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    tableId?: number;

    @ApiProperty({
        description: 'Имя гостя',
        example: 'Иван Иванов'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    guestName!: string;

    @ApiProperty({
        description: 'Телефон гостя',
        example: '79170000000'
    })
    @IsString()
    @Matches(/^\d{10,11}$/, {message: 'Телефон должен содержать 10 или 11 цифр'})
    guestPhone!: string;

    @ApiProperty({
        description: 'Количество гостей',
        example: 4,
        minimum: 1,
        maximum: 20
    })
    @IsInt()
    @Min(1)
    @Max(20)
    guestsCount!: number;

    @ApiProperty({
        description: 'Дата и время брони в ISO 8601',
        example: '2026-11-13T19:00:00.000Z'
    })
    @IsISO8601()
    scheduledAt!: string;

    @ApiPropertyOptional({
        description: 'Комментарий к брони',
        example: 'Стол у окна'
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    comment?: string;
}
