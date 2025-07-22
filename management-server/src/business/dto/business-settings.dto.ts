import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional } from 'class-validator';

export class BusinessSettingsDto {
  @ApiProperty({ description: 'Business timezone', default: 'UTC' })
  @IsString()
  @IsOptional()
  timezone?: string = 'UTC';

  @ApiProperty({ description: 'Business currency', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @ApiProperty({ description: 'Business language', default: 'en' })
  @IsString()
  @IsOptional()
  language?: string = 'en';

  @ApiProperty({ description: 'Business features', type: [String], default: [] })
  @IsArray()
  @IsOptional()
  features?: string[] = [];
} 