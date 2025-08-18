import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsArray,
} from 'class-validator';

// Base Resource Request
export class ResourceRequest {
  @ApiProperty({ description: 'Resource type' })
  @IsString()
  resourceType: string;

  @ApiProperty({ description: 'Operation to perform', required: false })
  @IsOptional()
  @IsString()
  operation?: string;

  @ApiProperty({ description: 'Resource data', required: false })
  @IsOptional()
  data?: any;
}

// Resource Data DTOs for Creation
export class DentalClientData {
  @ApiProperty({ description: 'First name' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Email' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'Phone number' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Date of birth', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ description: 'Medical history', required: false })
  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @ApiProperty({ description: 'Allergies', required: false })
  @IsOptional()
  @IsArray()
  allergies?: string[];
}

export class DentalAppointmentData {
  @ApiProperty({ description: 'Patient ID' })
  @IsString()
  patientId: string;

  @ApiProperty({ description: 'Dentist ID' })
  @IsString()
  dentistId: string;

  @ApiProperty({ description: 'Treatment ID' })
  @IsString()
  treatmentId: string;

  @ApiProperty({ description: 'Appointment date' })
  @IsDateString()
  appointmentDate: string;

  @ApiProperty({ description: 'Duration in minutes' })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ServiceData {
  @ApiProperty({ description: 'Service name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Service description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Duration in minutes' })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: 'Price' })
  @IsNumber()
  price: number;

  @ApiProperty({ description: 'Category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Active status' })
  @IsBoolean()
  active: boolean;
}
