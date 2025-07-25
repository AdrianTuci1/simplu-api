import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LocationInfoDto } from './location-info.dto';
import { BusinessSettingsDto } from './business-settings.dto';
import { BusinessPermissionsDto } from './business-permissions.dto';

export class CreateBusinessDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  companyName: string;

  @ApiProperty({ description: 'Company registration number' })
  @IsString()
  registrationNumber: string;

  @ApiProperty({ description: 'Business type', enum: ['dental', 'gym', 'hotel'] })
  @IsEnum(['dental', 'gym', 'hotel'])
  businessType: 'dental' | 'gym' | 'hotel';

  @ApiProperty({ description: 'Business locations', type: [LocationInfoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationInfoDto)
  locations: LocationInfoDto[];

  @ApiProperty({ description: 'Business settings', type: BusinessSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessSettingsDto)
  settings?: BusinessSettingsDto;

  @ApiProperty({ description: 'Business permissions', type: BusinessPermissionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessPermissionsDto)
  permissions?: BusinessPermissionsDto;

  @ApiProperty({ description: 'Custom domain (optional)' })
  @IsOptional()
  @IsString()
  customDomain?: string;

  @ApiProperty({ description: 'Stripe customer ID (optional)' })
  @IsOptional()
  @IsString()
  stripeCustomerId?: string;
} 