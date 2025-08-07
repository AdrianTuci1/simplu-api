import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional } from 'class-validator';

export class BusinessSettingsDto {
  @ApiProperty({ description: 'Business currency', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @ApiProperty({ description: 'Business language', default: 'en' })
  @IsString()
  @IsOptional()
  language?: string = 'en';

  @ApiProperty({ description: 'Business date format', default: 'DD/MM/YYYY' })
  @IsString()
  @IsOptional()
  dateFormat?: string = 'DD/MM/YYYY';

  @ApiProperty({ description: 'Business time format', default: '24h' })
  @IsString()
  @IsOptional()
  timeFormat?: string = '24h';

  @ApiProperty({ description: 'Business working hours' })
  @IsOptional()
  workingHours?: {
    [day: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
} 