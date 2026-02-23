import {Type} from 'class-transformer';
import {IsOptional, IsString} from 'class-validator';
import {BaseTicketDto} from './base-ticket.dto';

export class AdditionalEditAttributes {
    @IsOptional()
    @IsString()
    inn?: string;

    @IsOptional()
    @IsString()
    kpp?: string;

    @IsOptional()
    @IsString()
    director?: string;

    @IsOptional()
    @IsString()
    name?: string;
}

export class UpdateOrgTicketRequestDto extends BaseTicketDto<AdditionalEditAttributes> {
    @Type(() => AdditionalEditAttributes)
    data: AdditionalEditAttributes;
}
