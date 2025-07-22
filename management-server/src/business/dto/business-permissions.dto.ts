import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional } from 'class-validator';

export class BusinessPermissionsDto {
  @ApiProperty({ description: 'Available roles', type: [String], default: [] })
  @IsArray()
  @IsOptional()
  roles?: string[] = [];

  @ApiProperty({ description: 'Available modules', type: [String], default: [] })
  @IsArray()
  @IsOptional()
  modules?: string[] = [];
} 