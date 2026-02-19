import {PlanTier} from '@/types';
import {ApiProperty} from '@nestjs/swagger';
import {IsEnum, IsNotEmpty, IsNumberString, IsPhoneNumber, IsString} from 'class-validator';

export class CreateOrgDto {
    @ApiProperty({
        name: 'name',
        description: 'Название организации',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        name: 'inn',
        description: 'ИНН организации',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    inn: string;

    @ApiProperty({
        name: 'kpp',
        description: 'КПП организации',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    kpp: string;

    @ApiProperty({
        name: 'director',
        description: 'ФИО директора организации',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    director: string;

    @ApiProperty({
        name: 'phone_number',
        description: 'Номер телефона организации',
        required: true
    })
    @IsNumberString()
    @IsNotEmpty()
    @IsPhoneNumber('RU')
    phone_number: string;

    @ApiProperty({
        name: 'plan',
        description: 'Тарифный план',
        required: true
    })
    @IsEnum(PlanTier)
    @IsNotEmpty()
    plan: string;
}
