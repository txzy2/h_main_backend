import {ApiProperty} from '@nestjs/swagger';
import {IsNotEmpty, IsString, MaxLength, ValidateNested} from 'class-validator';

/**
 * Базовый DTO для создания заявок
 * @template T - Тип дополнительных данных
 */
export class BaseTicketDto<T> {
    /**
     * Хеш-идентификатор организации
     */
    @ApiProperty({description: 'Хеш-идентификатор организации'})
    @IsString()
    @IsNotEmpty()
    org_hash: string;

    /**
     * Причина создания заявки
     */
    @ApiProperty({description: 'Причина создания заявки', maxLength: 255})
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    reason: string;

    /**
     * Тип создаваемой заявки
     */
    @ApiProperty({description: 'Тип создаваемой заявки', maxLength: 255})
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    ticket_type: string;

    /**
     * Дополнительные данные заявки
     */
    @ApiProperty({description: 'Дополнительные данные заявки'})
    @IsNotEmpty()
    @ValidateNested()
    data: T;
}
