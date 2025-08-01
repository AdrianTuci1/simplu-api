import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsArray, IsEnum, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { AddressData, EmergencyContactData } from '../common/shared-interfaces';

// Insurance information specific to dental
export class InsuranceInfoData {
  @ApiProperty({ description: 'Insurance provider' })
  @IsString()
  provider: string;

  @ApiProperty({ description: 'Policy number' })
  @IsString()
  policyNumber: string;

  @ApiProperty({ description: 'Group number', required: false })
  @IsOptional()
  @IsString()
  groupNumber?: string;

  @ApiProperty({ description: 'Coverage percentage', required: false })
  @IsOptional()
  @IsNumber()
  coveragePercentage?: number;
}

// Simplified appointment data for patient history
export class DentalAppointmentSummary {
  @ApiProperty({ description: 'Appointment ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Appointment date and time' })
  @IsString()
  appointmentDate: string;

  @ApiProperty({ description: 'Dentist name' })
  @IsString()
  dentistName: string;

  @ApiProperty({ description: 'Treatment performed' })
  @IsString()
  treatment: string;

  @ApiProperty({
    description: 'Appointment status',
    enum: ['completed', 'cancelled', 'no-show']
  })
  @IsEnum(['completed', 'cancelled', 'no-show'])
  status: 'completed' | 'cancelled' | 'no-show';

  @ApiProperty({ description: 'Cost of appointment', required: false })
  @IsOptional()
  @IsNumber()
  cost?: number;
}

// Dental patient data model
export class DentalPatientData {
  @ApiProperty({ description: 'Patient name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Patient email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Patient phone number' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Birth year' })
  @IsNumber()
  birthYear: number;

  @ApiProperty({
    description: 'Gender',
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  })
  @IsEnum(['male', 'female', 'other', 'prefer-not-to-say'])
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';

  @ApiProperty({ description: 'Patient address', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressData)
  address?: AddressData;

  @ApiProperty({ description: 'Medical history', required: false })
  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @ApiProperty({ description: 'Known allergies', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiProperty({ description: 'Emergency contact', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactData)
  emergencyContact?: EmergencyContactData;

  @ApiProperty({ description: 'Insurance information', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => InsuranceInfoData)
  insuranceInfo?: InsuranceInfoData;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Patient tags for categorization', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];



  @ApiProperty({ description: 'Last 10 appointments', required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DentalAppointmentSummary)
  lastAppointments?: DentalAppointmentSummary[];

  @ApiProperty({ description: 'Patient status', enum: ['active', 'inactive', 'archived'] })
  @IsEnum(['active', 'inactive', 'archived'])
  status: 'active' | 'inactive' | 'archived';
}