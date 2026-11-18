import {ApiProperty} from '@nestjs/swagger';
import {IsNotEmpty, IsString, MaxLength, MinLength} from 'class-validator';

export class CancelBookingDto {
    @ApiProperty({
        description: 'Причина отмены брони',
        example: 'Гость не пришёл'
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(500)
    reason!: string;
}
