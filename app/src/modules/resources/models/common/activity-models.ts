import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';

// Activity log data model
export class ActivityData {
  @ApiProperty({ description: 'User ID who performed the action' })
  @IsString()
  userId: string;

  @ApiProperty({ 
    description: 'Activity type',
    enum: ['login', 'logout', 'create', 'update', 'delete', 'view', 'export', 'import', 'error']
  })
  @IsEnum(['login', 'logout', 'create', 'update', 'delete', 'view', 'export', 'import', 'error'])
  type: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'export' | 'import' | 'error';

  @ApiProperty({ description: 'Action performed' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Resource type affected', required: false })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiProperty({ description: 'Resource ID affected', required: false })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiProperty({ description: 'Activity details', required: false })
  @IsOptional()
  details?: Record<string, any>;

  @ApiProperty({ description: 'IP address', required: false })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ description: 'User agent', required: false })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ description: 'Activity timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ 
    description: 'Activity status',
    enum: ['success', 'failed', 'warning']
  })
  @IsEnum(['success', 'failed', 'warning'])
  status: 'success' | 'failed' | 'warning';
}

// History data model (alias for ActivityData for frontend compatibility)
export class HistoryData extends ActivityData {
  @ApiProperty({ description: 'Entity type affected', required: false })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiProperty({ description: 'Entity ID affected', required: false })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty({ description: 'Entity name for display', required: false })
  @IsOptional()
  @IsString()
  entityName?: string;

  @ApiProperty({ description: 'Action description' })
  @IsString()
  description: string;
}