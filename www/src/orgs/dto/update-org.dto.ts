import {PartialType, OmitType} from '@nestjs/swagger';
import {CreateOrgDto} from './create-org.dto';
import {IsNotEmpty, IsString} from 'class-validator';

export class UpdateOrgDto extends PartialType(OmitType(CreateOrgDto, ['inn', 'kpp'] as const)) {
    @IsString()
    @IsNotEmpty()
    hash: string;
}
