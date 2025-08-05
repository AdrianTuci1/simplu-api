import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Access hours interface
export class AccessHoursData {
  @ApiProperty({ description: 'Start time (HH:mm format)' })
  @IsString()
  start: string;

  @ApiProperty({ description: 'End time (HH:mm format)' })
  @IsString()
  end: string;

  @ApiProperty({ description: 'Days of week', type: [String] })
  @IsArray()
  @IsString({ each: true })
  daysOfWeek: string[];
}

// Gym membership package data model
export class GymMembershipData {
  @ApiProperty({ description: 'Membership name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Membership description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Duration in days' })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: 'Membership price' })
  @IsNumber()
  price: number;

  @ApiProperty({ description: 'Membership features' })
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiProperty({ description: 'Access hours', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccessHoursData)
  accessHours?: AccessHoursData;

  @ApiProperty({ description: 'Maximum freeze days' })
  @IsNumber()
  maxFreezeDays: number;

  @ApiProperty({
    description: 'Contract type',
    enum: ['monthly', 'annual', 'lifetime', 'daily'],
  })
  @IsEnum(['monthly', 'annual', 'lifetime', 'daily'])
  contractType: 'monthly' | 'annual' | 'lifetime' | 'daily';

  @ApiProperty({ description: 'Membership is active' })
  @IsBoolean()
  active: boolean;

  @ApiProperty({ description: 'Setup fee', required: false })
  @IsOptional()
  @IsNumber()
  setupFee?: number;
}
