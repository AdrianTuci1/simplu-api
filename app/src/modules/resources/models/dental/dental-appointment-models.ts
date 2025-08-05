import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsEnum,
  IsBoolean,
} from 'class-validator';

// Dental appointment data model
export class DentalAppointmentData {
  @ApiProperty({ description: 'Patient ID' })
  @IsString()
  patientId: string;

  @ApiProperty({ description: 'Dentist ID' })
  @IsString()
  dentistId: string;

  @ApiProperty({ description: 'Treatment ID', required: false })
  @IsOptional()
  @IsString()
  treatmentId?: string;

  @ApiProperty({ description: 'Appointment date and time' })
  @IsDateString()
  appointmentDate: string;

  @ApiProperty({ description: 'Duration in minutes' })
  @IsNumber()
  duration: number;

  @ApiProperty({
    description: 'Appointment status',
    enum: [
      'scheduled',
      'confirmed',
      'in-progress',
      'completed',
      'cancelled',
      'no-show',
    ],
  })
  @IsEnum([
    'scheduled',
    'confirmed',
    'in-progress',
    'completed',
    'cancelled',
    'no-show',
  ])
  status:
    | 'scheduled'
    | 'confirmed'
    | 'in-progress'
    | 'completed'
    | 'cancelled'
    | 'no-show';

  @ApiProperty({ description: 'Appointment notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Treatment plan', required: false })
  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @ApiProperty({ description: 'Appointment cost', required: false })
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiProperty({ description: 'Insurance coverage', required: false })
  @IsOptional()
  @IsBoolean()
  insuranceCovered?: boolean;

  @ApiProperty({ description: 'Follow-up required', required: false })
  @IsOptional()
  @IsBoolean()
  followUpRequired?: boolean;

  @ApiProperty({ description: 'Follow-up date', required: false })
  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @ApiProperty({ description: 'Reminder sent', required: false })
  @IsOptional()
  @IsBoolean()
  reminderSent?: boolean;
}
