import { IsEmail, IsString, IsOptional, IsDate, IsArray, IsObject } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsDate()
  @IsOptional()
  dateOfBirth?: Date;

  @IsDate()
  @IsOptional()
  hireDate?: Date;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsObject()
  @IsOptional()
  schedule?: Record<string, any>;
} 