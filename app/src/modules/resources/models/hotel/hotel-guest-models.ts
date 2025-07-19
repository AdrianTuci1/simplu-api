import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsDateString, IsArray, IsEnum, IsBoolean, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AddressData } from '../common/shared-interfaces';

// ID document interface
export class IdDocumentData {
  @ApiProperty({ 
    description: 'Document type',
    enum: ['passport', 'drivers-license', 'national-id']
  })
  @IsEnum(['passport', 'drivers-license', 'national-id'])
  type: 'passport' | 'drivers-license' | 'national-id';

  @ApiProperty({ description: 'Document number' })
  @IsString()
  number: string;

  @ApiProperty({ description: 'Document expiry date', required: false })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

// Loyalty program interface
export class LoyaltyProgramData {
  @ApiProperty({ description: 'Loyalty program number' })
  @IsString()
  number: string;

  @ApiProperty({ 
    description: 'Loyalty tier',
    enum: ['bronze', 'silver', 'gold', 'platinum']
  })
  @IsEnum(['bronze', 'silver', 'gold', 'platinum'])
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';

  @ApiProperty({ description: 'Loyalty points' })
  @IsNumber()
  points: number;
}

// Guest preferences interface
export class GuestPreferencesData {
  @ApiProperty({ description: 'Preferred room type', required: false })
  @IsOptional()
  @IsString()
  roomType?: string;

  @ApiProperty({ description: 'Preferred bed type', required: false })
  @IsOptional()
  @IsString()
  bedType?: string;

  @ApiProperty({ description: 'Preferred floor', required: false })
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiProperty({ description: 'Smoking preference' })
  @IsBoolean()
  smoking: boolean;

  @ApiProperty({ description: 'Dietary preferences', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  diet?: string[];

  @ApiProperty({ description: 'Special requests', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialRequests?: string[];
}

// Hotel guest data model
export class HotelGuestData {
  @ApiProperty({ description: 'Guest first name' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Guest last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Guest email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Guest phone number' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Date of birth', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ description: 'Nationality', required: false })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiProperty({ description: 'Guest address' })
  @ValidateNested()
  @Type(() => AddressData)
  address: AddressData;

  @ApiProperty({ description: 'ID document information' })
  @ValidateNested()
  @Type(() => IdDocumentData)
  idDocument: IdDocumentData;

  @ApiProperty({ description: 'Loyalty program information', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LoyaltyProgramData)
  loyaltyProgram?: LoyaltyProgramData;

  @ApiProperty({ description: 'Guest preferences', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => GuestPreferencesData)
  preferences?: GuestPreferencesData;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ 
    description: 'Guest status',
    enum: ['active', 'vip', 'blacklisted']
  })
  @IsEnum(['active', 'vip', 'blacklisted'])
  status: 'active' | 'vip' | 'blacklisted';
}