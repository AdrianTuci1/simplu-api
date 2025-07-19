import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { BaseTimelineData } from '../common/shared-interfaces';

// Gym timeline data (classes and appointments view)
export class GymTimelineData extends BaseTimelineData {
  @ApiProperty({ description: 'Entry type', enum: ['class', 'personal-training', 'assessment'] })
  @IsEnum(['class', 'personal-training', 'assessment'])
  type: 'class' | 'personal-training' | 'assessment';

  @ApiProperty({ description: 'Member information', required: false })
  @IsOptional()
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };

  @ApiProperty({ description: 'Trainer/Instructor information' })
  trainer: {
    id: string;
    firstName: string;
    lastName: string;
  };

  @ApiProperty({ description: 'Class/service name', required: false })
  @IsOptional()
  @IsString()
  serviceName?: string;

  @ApiProperty({ description: 'Status', enum: ['scheduled', 'in-progress', 'completed', 'cancelled'] })
  @IsEnum(['scheduled', 'in-progress', 'completed', 'cancelled'])
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

  @ApiProperty({ description: 'Current capacity for classes', required: false })
  @IsOptional()
  @IsNumber()
  currentCapacity?: number;

  @ApiProperty({ description: 'Maximum capacity for classes', required: false })
  @IsOptional()
  @IsNumber()
  maxCapacity?: number;
}