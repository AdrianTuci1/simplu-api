import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class MetaCredentialsDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;

  @IsString()
  @IsOptional()
  businessAccountId?: string;

  @IsString()
  @IsNotEmpty()
  appSecret: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}

