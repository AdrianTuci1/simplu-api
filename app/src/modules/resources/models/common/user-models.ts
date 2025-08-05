import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsEnum,
  IsEmail,
} from 'class-validator';

// User data model
export class UserData {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'User first name' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'User last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User phone', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'User roles' })
  @IsArray()
  @IsString({ each: true })
  roles: string[];

  @ApiProperty({ description: 'User permissions' })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @ApiProperty({ description: 'User preferences', required: false })
  @IsOptional()
  preferences?: Record<string, any>;

  @ApiProperty({ description: 'User settings', required: false })
  @IsOptional()
  settings?: Record<string, any>;

  @ApiProperty({
    description: 'User status',
    enum: ['active', 'inactive', 'suspended'],
  })
  @IsEnum(['active', 'inactive', 'suspended'])
  status: 'active' | 'inactive' | 'suspended';

  @ApiProperty({ description: 'Last login date', required: false })
  @IsOptional()
  @IsDateString()
  lastLogin?: string;

  @ApiProperty({ description: 'Account creation date' })
  @IsDateString()
  createdAt: string;
}
