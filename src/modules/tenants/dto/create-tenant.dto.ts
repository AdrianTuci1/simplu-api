import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, MinLength } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ description: 'The name of the tenant' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'The unique slug for the tenant' })
  @IsString()
  @MinLength(2)
  slug: string;

  @ApiProperty({ description: 'The description of the tenant', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Additional settings for the tenant', required: false })
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
} 