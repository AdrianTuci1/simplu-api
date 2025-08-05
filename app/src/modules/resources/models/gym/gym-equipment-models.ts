import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Maintenance schedule interface
export class MaintenanceScheduleData {
  @ApiProperty({
    description: 'Maintenance frequency',
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual'],
  })
  @IsEnum(['daily', 'weekly', 'monthly', 'quarterly', 'annual'])
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

  @ApiProperty({ description: 'Last maintenance date' })
  @IsDateString()
  lastMaintenance: string;

  @ApiProperty({ description: 'Next maintenance date' })
  @IsDateString()
  nextMaintenance: string;
}

// Gym equipment data model
export class GymEquipmentData {
  @ApiProperty({ description: 'Equipment name' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Equipment category',
    enum: ['cardio', 'strength', 'free-weights', 'functional', 'recovery'],
  })
  @IsEnum(['cardio', 'strength', 'free-weights', 'functional', 'recovery'])
  category: 'cardio' | 'strength' | 'free-weights' | 'functional' | 'recovery';

  @ApiProperty({ description: 'Manufacturer' })
  @IsString()
  manufacturer: string;

  @ApiProperty({ description: 'Equipment model' })
  @IsString()
  model: string;

  @ApiProperty({ description: 'Serial number', required: false })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiProperty({ description: 'Purchase date' })
  @IsDateString()
  purchaseDate: string;

  @ApiProperty({ description: 'Warranty expiry date', required: false })
  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string;

  @ApiProperty({ description: 'Maintenance schedule' })
  @ValidateNested()
  @Type(() => MaintenanceScheduleData)
  maintenanceSchedule: MaintenanceScheduleData;

  @ApiProperty({
    description: 'Equipment status',
    enum: ['active', 'maintenance', 'out-of-order', 'retired'],
  })
  @IsEnum(['active', 'maintenance', 'out-of-order', 'retired'])
  status: 'active' | 'maintenance' | 'out-of-order' | 'retired';

  @ApiProperty({ description: 'Purchase cost', required: false })
  @IsOptional()
  @IsNumber()
  purchaseCost?: number;

  @ApiProperty({ description: 'Location in gym', required: false })
  @IsOptional()
  @IsString()
  location?: string;
}
