import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Base address interface - shared across all business types
export class AddressData {
  @ApiProperty({ description: 'Street address' })
  @IsString()
  street: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'State/Province' })
  @IsString()
  state: string;

  @ApiProperty({ description: 'ZIP/Postal code' })
  @IsString()
  zipCode: string;

  @ApiProperty({ description: 'Country', required: false })
  @IsOptional()
  @IsString()
  country?: string;
}

// Emergency contact interface - shared across all business types
export class EmergencyContactData {
  @ApiProperty({ description: 'Contact name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Contact phone' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Relationship' })
  @IsString()
  relationship: string;
}

// Working hours interface - shared across business types
export class WorkingHoursData {
  @ApiProperty({ description: 'Start time (HH:mm format)' })
  @IsString()
  start: string;

  @ApiProperty({ description: 'End time (HH:mm format)' })
  @IsString()
  end: string;

  @ApiProperty({ description: 'Available on this day' })
  @IsBoolean()
  available: boolean;
}

// Base timeline entry interface
export class BaseTimelineData {
  @ApiProperty({ description: 'Timeline entry ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Start date and time' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'End date and time' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ description: 'Duration in minutes' })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Color for calendar display', required: false })
  @IsOptional()
  @IsString()
  color?: string;
}
