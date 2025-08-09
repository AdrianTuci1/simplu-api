import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CompanyAddressDto {
  @ApiProperty({ description: 'Company street address' })
  @IsString()
  street: string;

  @ApiProperty({ description: 'Company city' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'Company district/county (județ/sector)', required: false })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({ description: 'Company country' })
  @IsString()
  country: string;

  @ApiProperty({ description: 'Postal code', required: false })
  @IsOptional()
  @IsString()
  postalCode?: string;
}