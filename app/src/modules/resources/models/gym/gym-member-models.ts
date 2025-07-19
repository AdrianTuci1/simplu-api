import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsDateString, IsArray, IsEnum, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { AddressData, EmergencyContactData } from '../common/shared-interfaces';

// Simplified class data for member upcoming classes
export class GymClassSummary {
  @ApiProperty({ description: 'Class ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Class name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Class date and time' })
  @IsString()
  date: string;

  @ApiProperty({ description: 'Instructor name' })
  @IsString()
  instructorName: string;

  @ApiProperty({ description: 'Duration in minutes' })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: 'Class category' })
  @IsString()
  category: string;
}

// Simplified membership data for member
export class MembershipSummary {
  @ApiProperty({ description: 'Membership name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Membership type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Start date' })
  @IsString()
  startDate: string;

  @ApiProperty({ description: 'End date' })
  @IsString()
  endDate: string;

  @ApiProperty({ description: 'Status' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Monthly fee', required: false })
  @IsOptional()
  @IsNumber()
  monthlyFee?: number;
}

// Gym member data model
export class GymMemberData {
  @ApiProperty({ description: 'Member name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Member email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Member phone number' })
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

  @ApiProperty({ description: 'Member tags for categorization', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Upcoming classes', required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GymClassSummary)
  upcomingClasses?: GymClassSummary[];

  @ApiProperty({ description: 'Current membership details', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => MembershipSummary)
  membership?: MembershipSummary;

  @ApiProperty({ description: 'Preferred trainer ID', required: false })
  @IsOptional()
  @IsString()
  preferredTrainerId?: string;
}