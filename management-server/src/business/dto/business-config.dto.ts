import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsEnum, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class BusinessLocationDto {
  @ApiProperty({ description: 'Location name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Location address' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'Location timezone', default: 'Europe/Bucharest' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ description: 'Location active status', default: true })
  @IsOptional()
  active?: boolean;
}

export class BusinessSettingsDto {
  @ApiProperty({ description: 'Business currency', default: 'RON' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Business language', default: 'ro' })
  @IsOptional()
  @IsString()
  language?: string;
}

export class ConfigureBusinessDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  companyName: string;

  @ApiProperty({ description: 'Business type', enum: ['dental', 'gym', 'hotel'] })
  @IsString()
  businessType: string;

  @ApiProperty({ description: 'Company registration number' })
  @IsOptional()
  @IsString()
  registrationNumber?: string;



  @ApiProperty({ description: 'Business locations', type: [BusinessLocationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessLocationDto)
  locations: BusinessLocationDto[];

  @ApiProperty({ description: 'Business settings' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessSettingsDto)
  settings?: BusinessSettingsDto;

  @ApiProperty({ description: 'Email to configure business for (if different from current user)' })
  @IsOptional()
  @IsString()
  configureForEmail?: string;

  @ApiProperty({ description: 'Domain type', enum: ['subdomain', 'custom'], default: 'subdomain' })
  @IsOptional()
  @IsEnum(['subdomain', 'custom'])
  domainType?: 'subdomain' | 'custom';

  @ApiProperty({ description: 'Domain label' })
  @IsOptional()
  @IsString()
  domainLabel?: string;

  @ApiProperty({ description: 'Custom TLD for custom domain' })
  @IsOptional()
  @IsString()
  customTld?: string;

  @ApiProperty({ description: 'Client page type', enum: ['website', 'form'], default: 'website' })
  @IsOptional()
  @IsEnum(['website', 'form'])
  clientPageType?: 'website' | 'form';

  @ApiProperty({ description: 'Billing email' })
  @IsOptional()
  @IsString()
  billingEmail?: string;
}

export class SetupPaymentDto {
  @ApiProperty({ description: 'Plan type', enum: ['basic', 'premium'], default: 'basic' })
  @IsOptional()
  @IsEnum(['basic', 'premium'])
  planKey?: 'basic' | 'premium';

  @ApiProperty({ description: 'Billing interval', enum: ['month', 'year'], default: 'month' })
  @IsOptional()
  @IsEnum(['month', 'year'])
  billingInterval?: 'month' | 'year';

  @ApiProperty({ description: 'Currency', default: 'ron' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class LaunchBusinessDto {
  @ApiProperty({ description: 'Secret code required to launch business', example: 'LAUNCH_SECRET_2024' })
  @IsString()
  @IsNotEmpty()
  secretCode: string;
} 