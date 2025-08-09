import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsArray, IsOptional, ValidateNested, IsEmail, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { LocationInfoDto } from './location-info.dto';
import { BusinessSettingsDto } from './business-settings.dto';
import { CompanyAddressDto } from './company-address.dto';

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

  @ApiProperty({ description: 'Company address for invoicing', type: CompanyAddressDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CompanyAddressDto)
  companyAddress?: CompanyAddressDto;

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

  @ApiProperty({ description: 'Modules to be deactivated', type: [String], required: false })
  @IsOptional()
  @IsArray()
  deactivatedModules?: string[];

  @ApiProperty({ description: 'Custom domain (optional)' })
  @IsOptional()
  @IsString()
  customDomain?: string;

  @ApiProperty({ description: 'Preferred subdomain label (optional if customDomain provided)' })
  @IsOptional()
  @IsString()
  subdomainLabel?: string;

  @ApiProperty({ description: 'Application label/name (optional, defaults to companyName)' })
  @IsOptional()
  @IsString()
  appLabel?: string;

  // Deprecated: Stripe customer is now per-user, not per-business

  @ApiProperty({ description: 'Configure on behalf of email (optional)' })
  @IsOptional()
  @IsEmail()
  configureForEmail?: string;

  @ApiProperty({ description: 'Billing email for Stripe invoices (optional, defaults to business owner email)' })
  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @ApiProperty({ description: 'Additional authorized emails (optional)', type: [String] })
  @IsOptional()
  @IsArray()
  authorizedEmails?: string[];

  // Domain selection (preferred new fields)
  @ApiProperty({ description: 'Domain type selection', enum: ['subdomain', 'custom'], required: false })
  @IsOptional()
  @IsEnum(['subdomain', 'custom'])
  domainType?: 'subdomain' | 'custom';

  @ApiProperty({ description: 'Domain label/slug used for either subdomain or custom domain (e.g., numele-firmei)', required: false })
  @IsOptional()
  @IsString()
  domainLabel?: string;

  @ApiProperty({ description: 'Custom TLD for custom domain (e.g., ro, com). Used with domainLabel when customDomain not provided', required: false })
  @IsOptional()
  @IsString()
  customTld?: string;

  @ApiProperty({ description: 'Selected subscription plan price ID (e.g., price_basic_monthly, price_premium_monthly)', required: false })
  @IsOptional()
  @IsString()
  subscriptionPlanPriceId?: string;

  @ApiProperty({ description: 'Client page type', enum: ['website', 'form'], required: false, default: 'website' })
  @IsOptional()
  @IsEnum(['website', 'form'])
  clientPageType?: 'website' | 'form';
} 