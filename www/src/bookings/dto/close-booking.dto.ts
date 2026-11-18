import {ApiPropertyOptional} from '@nestjs/swagger';
import {IsInt, IsOptional, IsString, Max, MaxLength, Min} from 'class-validator';

export class CloseBookingDto {
    @ApiPropertyOptional({
        description: 'Итоговая сумма чека, ₽',
        example: 3500,
        minimum: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(1_000_000)
    amount?: number;

    @ApiPropertyOptional({
        description: 'Комментарий менеджера при закрытии',
        example: 'Всё прошло хорошо'
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    comment?: string;
}
