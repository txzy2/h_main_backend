import {ApiProperty} from '@nestjs/swagger';
import {IsNotEmpty, IsNumber, IsPhoneNumber, IsString, MaxLength, MinLength} from 'class-validator';

export class CreateUserDto {
    @ApiProperty({example: 'John Doe'})
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({example: 'John'})
    @IsNotEmpty()
    @IsString()
    login: string;

    @ApiProperty({example: '1234567890'})
    @MinLength(10)
    @MaxLength(11)
    @IsNotEmpty()
    @IsPhoneNumber('RU')
    phoneNumber: string;

    @ApiProperty({example: '12345678'})
    @IsNotEmpty()
    @IsString()
    extId: string;

    @ApiProperty({example: 1})
    @IsNotEmpty()
    @IsNumber()
    orgId: number;
}
