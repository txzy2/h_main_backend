import {ApiProperty} from '@nestjs/swagger';
import {IsNotEmpty, IsNumber, IsString, IsUUID} from 'class-validator';

export class CreateBookingDto {
    @ApiProperty({
        name: 'location_id',
        description: 'Уникальный идентификатор точки',
        required: true
    })
    @IsNumber()
    @IsNotEmpty()
    locationId!: number;

    @ApiProperty({
        name: 'user_ext_id',
        description: 'Внешний идентификатор пользователя',
        required: true
    })
    @IsString()
    @IsUUID()
    @IsNotEmpty()
    userExtId!: string;

    @ApiProperty({
        name: 'guests_count',
        description: 'Количество гостей',
        required: true
    })
    @IsNotEmpty()
    @IsNumber()
    guestsCount!: number;

    @ApiProperty({
        name: 'status',
        description: 'Статус брони',
        required: false
    })
    @IsString()
    comment?: string;
}
