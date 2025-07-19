import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsNumber, IsEnum } from 'class-validator';
import { BaseTimelineData } from '../common/shared-interfaces';

// Dental timeline data (appointments view)
export class DentalTimelineData extends BaseTimelineData {
  @ApiProperty({ description: 'Entry type', enum: ['appointment', 'treatment', 'consultation'] })
  @IsEnum(['appointment', 'treatment', 'consultation'])
  type: 'appointment' | 'treatment' | 'consultation';

  @ApiProperty({ description: 'Patient information' })
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };

  @ApiProperty({ description: 'Dentist information' })
  dentist: {
    id: string;
    firstName: string;
    lastName: string;
  };

  @ApiProperty({ description: 'Treatment/service name', required: false })
  @IsOptional()
  @IsString()
  treatmentName?: string;

  @ApiProperty({ description: 'Status', enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'] })
  @IsEnum(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'])
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
}