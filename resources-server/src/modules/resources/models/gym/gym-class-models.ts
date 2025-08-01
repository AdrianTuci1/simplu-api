import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsArray, IsNumber, IsEnum } from 'class-validator';

// Gym class data model
export class GymClassData {
  @ApiProperty({ description: 'Class name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Class description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Instructor ID' })
  @IsString()
  instructorId: string;

  @ApiProperty({ description: 'Class date and time' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Duration in minutes' })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: 'Maximum capacity' })
  @IsNumber()
  maxCapacity: number;

  @ApiProperty({ description: 'Current enrollment count' })
  @IsNumber()
  currentEnrollment: number;

  @ApiProperty({
    description: 'Class category',
    enum: ['cardio', 'strength', 'yoga', 'pilates', 'dance', 'martial-arts', 'aqua', 'crossfit']
  })
  @IsEnum(['cardio', 'strength', 'yoga', 'pilates', 'dance', 'martial-arts', 'aqua', 'crossfit'])
  category: 'cardio' | 'strength' | 'yoga' | 'pilates' | 'dance' | 'martial-arts' | 'aqua' | 'crossfit';

  @ApiProperty({
    description: 'Difficulty level',
    enum: ['beginner', 'intermediate', 'advanced']
  })
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';

  @ApiProperty({ description: 'Required equipment', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipment?: string[];

  @ApiProperty({
    description: 'Class status',
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled']
  })
  @IsEnum(['scheduled', 'in-progress', 'completed', 'cancelled'])
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

  @ApiProperty({ description: 'Class cost', required: false })
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiProperty({ description: 'Special instructions', required: false })
  @IsOptional()
  @IsString()
  instructions?: string;
}