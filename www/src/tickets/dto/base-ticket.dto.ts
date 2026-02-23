import {IsNotEmpty, IsString, MaxLength, ValidateNested} from 'class-validator';

export class BaseTicketDto<T> {
    @IsString()
    @IsNotEmpty()
    org_hash: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    reason: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    ticket_type: string;

    @IsNotEmpty()
    @ValidateNested()
    data: T;
}
