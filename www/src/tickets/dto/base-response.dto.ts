import {ApiProperty} from '@nestjs/swagger';

/**
 * DTO ответа на создание заявки
 */
export class BaseTicketCreateResponseDto {
    @ApiProperty({description: 'Уникальный идентификатор заявки'})
    ticket_id: string;

    @ApiProperty({description: 'Сообщение ответа'})
    message: string;
}
