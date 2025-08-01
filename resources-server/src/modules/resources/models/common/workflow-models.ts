import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsArray, IsEnum } from 'class-validator';

// Workflow data model
export class WorkflowData {
  @ApiProperty({ description: 'Workflow name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Workflow description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Workflow status',
    enum: ['active', 'inactive', 'draft', 'archived']
  })
  @IsEnum(['active', 'inactive', 'draft', 'archived'])
  status: 'active' | 'inactive' | 'draft' | 'archived';

  @ApiProperty({ description: 'Workflow steps', type: [Object] })
  @IsArray()
  steps: Record<string, any>[];

  @ApiProperty({ description: 'Trigger conditions', required: false })
  @IsOptional()
  triggers?: Record<string, any>;

  @ApiProperty({ description: 'Created by user ID' })
  @IsString()
  createdBy: string;

  @ApiProperty({ description: 'Creation date' })
  @IsDateString()
  createdAt: string;

  @ApiProperty({ description: 'Last modification date', required: false })
  @IsOptional()
  @IsDateString()
  updatedAt?: string;
}