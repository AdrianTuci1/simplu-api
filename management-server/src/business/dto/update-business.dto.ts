import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LocationInfoDto } from './location-info.dto';
import { BusinessSettingsDto } from './business-settings.dto';
import { BusinessPermissionsDto } from './business-permissions.dto';

export class UpdateBusinessDto {
  @ApiProperty({ description: 'Company name', required: false })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ description: 'Company registration number', required: false })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiProperty({ description: 'Business type', enum: ['dental', 'gym', 'hotel'], required: false })
  @IsOptional()
  @IsEnum(['dental', 'gym', 'hotel'])
  businessType?: 'dental' | 'gym' | 'hotel';

  @ApiProperty({ description: 'Business locations', type: [LocationInfoDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationInfoDto)
  locations?: LocationInfoDto[];

  @ApiProperty({ description: 'Business settings', type: BusinessSettingsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessSettingsDto)
  settings?: BusinessSettingsDto;

  @ApiProperty({ description: 'Business permissions', type: BusinessPermissionsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessPermissionsDto)
  permissions?: BusinessPermissionsDto;

  @ApiProperty({ description: 'Custom domain (optional)', required: false })
  @IsOptional()
  @IsString()
  customDomain?: string;
} 