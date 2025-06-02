import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, IsBoolean, IsObject, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ServiceCategoryDto {
  @IsString()
  id: string;

  @IsString()
  name: string;
}

export class ServiceSettingsDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxBookingsPerDay?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minNoticeHours?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxNoticeDays?: number;

  @IsString()
  @IsOptional()
  cancellationPolicy?: string;
}

export class CreateServiceDto {
  @ApiProperty({ description: 'The name of the service' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'The description of the service', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'The duration of the service in minutes' })
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiProperty({ description: 'The price of the service' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'The category of the service' })
  @IsObject()
  @IsOptional()
  @Type(() => ServiceCategoryDto)
  category?: ServiceCategoryDto;

  @ApiProperty({ description: 'The images associated with the service', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiProperty({ description: 'The requirements for the service', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requirements?: string[];

  @ApiProperty({ description: 'The benefits of the service', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  benefits?: string[];

  @ApiProperty({ description: 'Whether the service is active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'Additional settings for the service', required: false })
  @IsObject()
  @IsOptional()
  @Type(() => ServiceSettingsDto)
  settings?: ServiceSettingsDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  employeeIds?: string[];
} 