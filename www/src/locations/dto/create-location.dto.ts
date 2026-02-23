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
import {ApiProperty} from '@nestjs/swagger';

export class ReqLocation {
    @ApiProperty({description: 'Название точки', example: 'Центральный офис'})
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @ApiProperty({description: 'Адрес точки', example: 'г. Москва, ул. Ленина, д. 1'})
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    address: string;

    @ApiProperty({description: 'Номер телефона точки', example: '79991234567'})
    @IsString()
    @IsNotEmpty()
    @IsPhoneNumber('RU')
    @MaxLength(11)
    phone: string;

    @ApiProperty({description: 'Количество активных мест', example: 10, maximum: 50})
    @IsNumber()
    @Max(50)
    @IsNotEmpty()
    active_places: number;
}

export class CreateLocationDto {
    @ApiProperty({description: 'ID организации', example: 1})
    @IsNumber()
    @IsNotEmpty()
    org_id: number;

    @ApiProperty({
        description: 'Список точек',
        type: [ReqLocation]
    })
    @IsNotEmpty()
    @ValidateNested({each: true})
    @Type(() => ReqLocation)
    locations: ReqLocation[];
}
