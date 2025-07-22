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

export class TwilioCredentialsDto {
  @IsString()
  @IsNotEmpty()
  accountSid: string;

  @IsString()
  @IsNotEmpty()
  authToken: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
} 