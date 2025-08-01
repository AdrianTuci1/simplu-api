import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsArray } from 'class-validator';

// Simplified gym staff data model
export class GymStaffData {
  @ApiProperty({ description: 'Staff full name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Staff email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Staff phone number' })
  @IsString()
  phone: string;

  @ApiProperty({ 
    description: 'Days of the week when staff is on duty',
    example: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  })
  @IsArray()
  @IsString({ each: true })
  dutyDays: string[];
}