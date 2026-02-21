import {
    IsNotEmpty,
    IsNumber,
    IsPhoneNumber,
    IsString,
    Max,
    MaxLength,
    ValidateNested
} from 'class-validator';

import {Type} from 'class-transformer';

export class ReqLocation {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    address: string;

    @IsString()
    @IsNotEmpty()
    @IsPhoneNumber('RU')
    @MaxLength(11)
    phone: string;

    @IsNumber()
    @Max(50)
    @IsNotEmpty()
    active_places: number;
}

export class CreateLocationDto {
    @IsNumber()
    @Max(50)
    @IsNotEmpty()
    org_id: number;

    @IsNotEmpty()
    @ValidateNested({each: true})
    @Type(() => ReqLocation)
    locations: ReqLocation[];
}
