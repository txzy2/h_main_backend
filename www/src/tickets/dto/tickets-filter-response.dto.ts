import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {RequestStatus} from '@prisma/client';
import {type JsonValue} from '@prisma/client/runtime/client';

export class FilterTicketResponseDto {
    @ApiProperty({
        description: 'Уникальный идентификатор заявки',
        example: 'def8acee-22fb-42c5-adc2-2416ae65be58'
    })
    ticket_id: string;

    @ApiProperty({
        description: 'Идентификатор организации',
        example: 1
    })
    org_id: number;

    @ApiProperty({
        description: 'Статус заявки',
        enum: RequestStatus,
        example: RequestStatus.Pending
    })
    status: RequestStatus;

    @ApiPropertyOptional({
        description: 'Причина отклонения заявки',
        example: 'Некорректные данные организации',
        nullable: true
    })
    reason: string | null;

    @ApiProperty({
        description: 'Данные для обновления организации',
        example: {name: 'Новое название'}
    })
    requested_data: JsonValue;

    @ApiProperty({
        description: 'Псевдоним типа заявки',
        example: 'org_update'
    })
    type_name: string;

    @ApiProperty({
        description: 'Дата создания заявки',
        example: '2026-02-23T20:10:48.813Z'
    })
    created_at: Date;
}
