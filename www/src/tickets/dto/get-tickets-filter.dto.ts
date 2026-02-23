import {ApiProperty} from '@nestjs/swagger';
import {IsNotEmpty, IsNumber, IsOptional, IsString} from 'class-validator';

/**
 * DTO для фильтрации заявок (query-параметры)
 */
export class FilterTicketsRequestQueryDto {
    /**
     * Максимальное количество заявок для возврата
     * @default 50
     */
    @ApiProperty({
        required: false,
        type: Number,
        description: 'Максимальное количество заявок для возврата',
        example: 50
    })
    @IsNumber()
    @IsOptional()
    limit?: number = 50;

    /**
     * Количество заявок для пропуска (пагинация)
     * @default 0
     */
    @ApiProperty({
        required: false,
        type: Number,
        description: 'Количество заявок для пропуска',
        example: 0
    })
    @IsNumber()
    @IsOptional()
    offset?: number = 0;

    /**
     * Хеш организации для фильтрации заявок
     */
    @ApiProperty({required: false, type: String, description: 'Хеш организации для фильтрации'})
    @IsNotEmpty()
    @IsString()
    @IsOptional()
    org_hash?: string;
}
