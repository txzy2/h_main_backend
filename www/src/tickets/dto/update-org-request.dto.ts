import {Type} from 'class-transformer';
import {IsOptional, IsString} from 'class-validator';
import {BaseTicketDto} from './base-ticket.dto';

/**
 * DTO for additional organization attributes in update request
 */
export class AdditionalEditAttributes {
    /**
     * Taxpayer Identification Number (INN)
     */
    @IsOptional()
    @IsString()
    inn?: string;

    /**
     * Tax Registration Code (KPP)
     */
    @IsOptional()
    @IsString()
    kpp?: string;

    /**
     * Director name
     */
    @IsOptional()
    @IsString()
    director?: string;

    /**
     * Organization name
     */
    @IsOptional()
    @IsString()
    name?: string;
}

/**
 * DTO for organization update ticket request
 */
export class UpdateOrgTicketRequestDto extends BaseTicketDto<AdditionalEditAttributes> {
    @Type(() => AdditionalEditAttributes)
    data: AdditionalEditAttributes;
}
