import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

// Permission data model
export class PermissionData {
  @ApiProperty({ description: 'Permission name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Permission display name' })
  @IsString()
  displayName: string;

  @ApiProperty({ description: 'Permission description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Resource name this permission applies to' })
  @IsString()
  resourceName: string;

  @ApiProperty({ description: 'Actions allowed by this permission' })
  @IsArray()
  @IsString({ each: true })
  actions: Array<'create' | 'read' | 'update' | 'delete' | 'list'>;

  @ApiProperty({ description: 'Permission is active' })
  @IsBoolean()
  active: boolean;

  @ApiProperty({ description: 'System permission (cannot be deleted/modified)' })
  @IsBoolean()
  isSystemPermission: boolean;

  @ApiProperty({ description: 'Business type specific permission', required: false })
  @IsOptional()
  @IsBoolean()
  businessTypeSpecific?: boolean;
}