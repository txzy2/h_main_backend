import {PartialType, ApiProperty} from '@nestjs/swagger';
import {CreateOrgDto} from './create-org.dto';
import {IsNotEmpty, IsOptional, IsString, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';

class PartialCreateOrgDto extends PartialType(CreateOrgDto) {}

export class UpdateOrgDto {
    @ApiProperty({
        description: 'Уникальный хэш организации',
        example: '006c9ef9d7ee203481fc9479f52b2bd4...',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    hash!: string;

    @ApiProperty({
        description: 'Уникальный идентификатор заявки',
        example: 'def8acee-22fb-42c5-adc2-2416ae65be58',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    ticket_id!: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => PartialCreateOrgDto)
    update_data?: PartialCreateOrgDto;
}
