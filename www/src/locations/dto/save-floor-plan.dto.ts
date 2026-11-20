import {ApiProperty} from '@nestjs/swagger';
import {IsNotEmpty, IsObject} from 'class-validator';
import type {FloorPlanLayout} from '../floor-plan.types';

export class SaveFloorPlanDto {
    @ApiProperty({
        description: 'JSON-лейаут плана зала: canvas, tables, zones, objects'
    })
    @IsObject()
    @IsNotEmpty()
    layout!: FloorPlanLayout;
}
