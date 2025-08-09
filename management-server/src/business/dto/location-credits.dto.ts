import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsPositive } from 'class-validator';

export class LocationCreditsDto {
  @ApiProperty({ description: 'Credits balance', default: 0 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  balance?: number;

  @ApiProperty({ description: 'Credits currency', default: 'RON' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Last updated timestamp' })
  @IsOptional()
  @IsString()
  lastUpdated?: string;
}