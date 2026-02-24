import {ApiProperty} from '@nestjs/swagger';
import {IsNumber, IsOptional} from 'class-validator';

export class FilterOrgsRequestDto {
    /**
     * Максимальное количество заявок для возврата
     * @default 50
     */
    @ApiProperty({
        required: false,
        type: Number,
        description: 'Максимальное количество оргнизаций для возврата',
        example: 50
    })
    @IsNumber()
    @IsOptional()
    limit?: number = 50;

    /**
     * Количество Организаций (пагинация)
     * @default 0
     */
    @ApiProperty({
        required: false,
        type: Number,
        description: 'Количество Организаций',
        example: 0
    })
    @IsNumber()
    @IsOptional()
    offset?: number = 0;
}
