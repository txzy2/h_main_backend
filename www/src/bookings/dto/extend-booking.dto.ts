import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {IsInt, IsOptional, IsString, Max, MaxLength, Min} from 'class-validator';

export class ExtendBookingDto {
    @ApiProperty({
        description: 'На сколько минут продлить бронь',
        example: 30,
        minimum: 15,
        maximum: 240
    })
    @IsInt()
    @Min(15)
    @Max(240)
    minutes!: number;

    @ApiPropertyOptional({
        description: 'Комментарий менеджера к продлению',
        example: 'Гости задержались'
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    comment?: string;
}
