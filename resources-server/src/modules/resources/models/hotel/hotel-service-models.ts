import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber, IsEnum, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Service availability interface
export class ServiceAvailabilityData {
  @ApiProperty({ description: 'Start time (HH:mm format)' })
  @IsString()
  start: string;

  @ApiProperty({ description: 'End time (HH:mm format)' })
  @IsString()
  end: string;

  @ApiProperty({ description: 'Days of week available' })
  @IsArray()
  @IsString({ each: true })
  daysOfWeek: string[];
}

// Hotel service data model
export class HotelServiceData {
  @ApiProperty({ description: 'Service name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Service description' })
  @IsString()
  description: string;

  @ApiProperty({ 
    description: 'Service category',
    enum: ['room-service', 'housekeeping', 'concierge', 'spa', 'restaurant', 'laundry', 'transport']
  })
  @IsEnum(['room-service', 'housekeeping', 'concierge', 'spa', 'restaurant', 'laundry', 'transport'])
  category: 'room-service' | 'housekeeping' | 'concierge' | 'spa' | 'restaurant' | 'laundry' | 'transport';

  @ApiProperty({ description: 'Service price', required: false })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ description: 'Duration in minutes', required: false })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiProperty({ description: 'Service availability' })
  @ValidateNested()
  @Type(() => ServiceAvailabilityData)
  availability: ServiceAvailabilityData;

  @ApiProperty({ description: 'Service is active' })
  @IsBoolean()
  active: boolean;
}