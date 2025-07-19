import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsDateString, IsArray, IsEnum, ValidateNested, IsNumber } from 'class-validator';
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

// Dental patient data model
export class DentalPatientData {
  @ApiProperty({ description: 'Patient first name' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Patient last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Patient email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Patient phone number' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Date of birth', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

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

  @ApiProperty({ description: 'Patient status', enum: ['active', 'inactive', 'archived'] })
  @IsEnum(['active', 'inactive', 'archived'])
  status: 'active' | 'inactive' | 'archived';
}