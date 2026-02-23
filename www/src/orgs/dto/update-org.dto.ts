import {PartialType, OmitType, ApiProperty} from '@nestjs/swagger';
import {CreateOrgDto} from './create-org.dto';
import {IsNotEmpty, IsString} from 'class-validator';

export class UpdateOrgDto extends PartialType(OmitType(CreateOrgDto, ['inn', 'kpp'] as const)) {
    @ApiProperty({
        description: 'Уникальный хэш организации',
        example: '006c9ef9d7ee203481fc9479f52b2bd4...',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    hash: string;
}
