import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
} from 'class-validator';

// Dental treatment/service data model
export class DentalTreatmentData {
  @ApiProperty({ description: 'Treatment name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Treatment description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Duration in minutes' })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: 'Treatment cost' })
  @IsNumber()
  cost: number;

  @ApiProperty({
    description: 'Treatment category',
    enum: [
      'cleaning',
      'filling',
      'crown',
      'root-canal',
      'extraction',
      'orthodontics',
      'cosmetic',
      'surgery',
      'consultation',
    ],
  })
  @IsEnum([
    'cleaning',
    'filling',
    'crown',
    'root-canal',
    'extraction',
    'orthodontics',
    'cosmetic',
    'surgery',
    'consultation',
  ])
  category:
    | 'cleaning'
    | 'filling'
    | 'crown'
    | 'root-canal'
    | 'extraction'
    | 'orthodontics'
    | 'cosmetic'
    | 'surgery'
    | 'consultation';

  @ApiProperty({ description: 'Requires anesthesia' })
  @IsBoolean()
  requiresAnesthesia: boolean;

  @ApiProperty({ description: 'Follow-up required' })
  @IsBoolean()
  followUpRequired: boolean;

  @ApiProperty({ description: 'Follow-up days', required: false })
  @IsOptional()
  @IsNumber()
  followUpDays?: number;

  @ApiProperty({ description: 'Treatment is active' })
  @IsBoolean()
  active: boolean;

  @ApiProperty({ description: 'Special instructions', required: false })
  @IsOptional()
  @IsString()
  instructions?: string;
}
