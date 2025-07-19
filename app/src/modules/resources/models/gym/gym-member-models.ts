import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsDateString, IsArray, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AddressData, EmergencyContactData } from '../common/shared-interfaces';

// Gym member data model
export class GymMemberData {
  @ApiProperty({ description: 'Member first name' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Member last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Member email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Member phone number' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Date of birth', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ description: 'Member address', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressData)
  address?: AddressData;

  @ApiProperty({
    description: 'Membership type',
    enum: ['basic', 'premium', 'vip', 'student', 'senior']
  })
  @IsEnum(['basic', 'premium', 'vip', 'student', 'senior'])
  membershipType: 'basic' | 'premium' | 'vip' | 'student' | 'senior';

  @ApiProperty({ description: 'Membership start date' })
  @IsDateString()
  membershipStart: string;

  @ApiProperty({ description: 'Membership end date' })
  @IsDateString()
  membershipEnd: string;

  @ApiProperty({
    description: 'Membership status',
    enum: ['active', 'suspended', 'expired', 'cancelled']
  })
  @IsEnum(['active', 'suspended', 'expired', 'cancelled'])
  status: 'active' | 'suspended' | 'expired' | 'cancelled';

  @ApiProperty({ description: 'Health conditions', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  healthConditions?: string[];

  @ApiProperty({ description: 'Fitness goals', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fitnessGoals?: string[];

  @ApiProperty({ description: 'Emergency contact', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactData)
  emergencyContact?: EmergencyContactData;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Preferred trainer ID', required: false })
  @IsOptional()
  @IsString()
  preferredTrainerId?: string;
}