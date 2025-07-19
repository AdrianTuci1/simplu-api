import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsDateString, IsArray, IsEnum, IsNumber } from 'class-validator';
import { WorkingHoursData } from '../common/shared-interfaces';

// Dental staff data model
export class DentalStaffData {
  @ApiProperty({ description: 'Staff first name' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Staff last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Staff email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Staff phone number' })
  @IsString()
  phone: string;

  @ApiProperty({
    description: 'Staff role',
    enum: ['dentist', 'hygienist', 'assistant', 'receptionist', 'manager', 'admin']
  })
  @IsEnum(['dentist', 'hygienist', 'assistant', 'receptionist', 'manager', 'admin'])
  role: 'dentist' | 'hygienist' | 'assistant' | 'receptionist' | 'manager' | 'admin';

  @ApiProperty({ description: 'Professional license number', required: false })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({ description: 'Specializations', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];

  @ApiProperty({ description: 'Working hours by day', required: false })
  @IsOptional()
  workingHours?: {
    monday?: WorkingHoursData;
    tuesday?: WorkingHoursData;
    wednesday?: WorkingHoursData;
    thursday?: WorkingHoursData;
    friday?: WorkingHoursData;
    saturday?: WorkingHoursData;
    sunday?: WorkingHoursData;
  };

  @ApiProperty({ description: 'Staff status', enum: ['active', 'inactive', 'on-leave'] })
  @IsEnum(['active', 'inactive', 'on-leave'])
  status: 'active' | 'inactive' | 'on-leave';

  @ApiProperty({ description: 'Hire date', required: false })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiProperty({ description: 'Hourly rate', required: false })
  @IsOptional()
  @IsNumber()
  hourlyRate?: number;
}