import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsBoolean, IsOptional } from 'class-validator';

export class LocationInfoDto {
  @ApiProperty({ description: 'Location ID', required: false })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({ description: 'Location name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Location address' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'Location phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Location email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Location timezone', default: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string = 'UTC';

  @ApiProperty({ description: 'Location active status', default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean = true;
} 