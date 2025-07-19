import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsArray, IsBoolean, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Role permissions interface
export class RolePermissionsData {
  @ApiProperty({ description: 'Resource name' })
  @IsString()
  resourceName: string;

  @ApiProperty({ description: 'Allowed operations' })
  @IsArray()
  @IsString({ each: true })
  operations: Array<'create' | 'read' | 'update' | 'delete' | 'list'>;
}

// Role data model
export class RoleData {
  @ApiProperty({ description: 'Role name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Role display name' })
  @IsString()
  displayName: string;

  @ApiProperty({ description: 'Role description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Role hierarchy level (higher = more permissions)' })
  @IsNumber()
  hierarchy: number;

  @ApiProperty({ description: 'Role permissions' })
  permissions: Record<string, Array<'create' | 'read' | 'update' | 'delete' | 'list'>>;

  @ApiProperty({ description: 'Role is active' })
  @IsBoolean()
  active: boolean;

  @ApiProperty({ description: 'Business type specific role', required: false })
  @IsOptional()
  @IsBoolean()
  businessTypeSpecific?: boolean;

  @ApiProperty({ description: 'System role (cannot be deleted/modified)' })
  @IsBoolean()
  isSystemRole: boolean;

  @ApiProperty({ description: 'Created by user ID', required: false })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiProperty({ description: 'Modified by user ID', required: false })
  @IsOptional()
  @IsString()
  modifiedBy?: string;

  @ApiProperty({ description: 'Creation date', required: false })
  @IsOptional()
  @IsDateString()
  createdAt?: string;

  @ApiProperty({ description: 'Last modification date', required: false })
  @IsOptional()
  @IsDateString()
  updatedAt?: string;
}