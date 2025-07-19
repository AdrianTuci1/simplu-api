import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsDateString, IsArray, IsEnum, IsBoolean, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AddressData } from '../common/shared-interfaces';

// Simplified reservation data for guest history
export class HotelReservationSummary {
  @ApiProperty({ description: 'Reservation ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Check-in date' })
  @IsString()
  checkInDate: string;

  @ApiProperty({ description: 'Check-out date' })
  @IsString()
  checkOutDate: string;

  @ApiProperty({ description: 'Room numbers' })
  @IsArray()
  @IsString({ each: true })
  roomNumbers: string[];

  @ApiProperty({ description: 'Number of nights' })
  @IsNumber()
  numberOfNights: number;

  @ApiProperty({ description: 'Total amount' })
  @IsNumber()
  totalAmount: number;

  @ApiProperty({ description: 'Reservation status' })
  @IsString()
  status: string;
}

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



// Hotel guest data model
export class HotelGuestData {
  @ApiProperty({ description: 'Guest name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Guest email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Guest phone number' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Birth year' })
  @IsNumber()
  birthYear: number;

  @ApiProperty({ 
    description: 'Gender',
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  })
  @IsEnum(['male', 'female', 'other', 'prefer-not-to-say'])
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';

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



  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Guest tags for categorization', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Guest reservations (can have multiple rooms)', required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HotelReservationSummary)
  reservations?: HotelReservationSummary[];

  @ApiProperty({ 
    description: 'Guest status',
    enum: ['active', 'vip', 'blacklisted']
  })
  @IsEnum(['active', 'vip', 'blacklisted'])
  status: 'active' | 'vip' | 'blacklisted';
}