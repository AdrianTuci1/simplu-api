import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsPositive, IsIn, IsEmail, ValidateIf } from 'class-validator';

export class ValidateSubscriptionDto {
  @ApiProperty({ 
    description: 'Stripe customer ID (optional, will create new customer if not provided)',
    required: false 
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ 
    description: 'Customer email for billing (required if customerId not provided)',
    required: false 
  })
  @ValidateIf(o => !o.customerId)
  @IsEmail()
  email?: string;

  @ApiProperty({ 
    description: 'Customer name (required if customerId not provided)',
    required: false 
  })
  @ValidateIf(o => !o.customerId)
  @IsString()
  name?: string;

  @ApiProperty({ 
    description: 'Stripe subscription ID to validate (optional for first payment)',
    required: false 
  })
  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @ApiProperty({ 
    description: 'Payment amount in cents (optional, will use subscription price if not provided)',
    required: false,
    minimum: 1,
    example: 100
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiProperty({ 
    description: 'Currency code',
    required: false,
    default: 'usd',
    enum: ['usd', 'eur', 'gbp', 'ron']
  })
  @IsOptional()
  @IsString()
  @IsIn(['usd', 'eur', 'gbp', 'ron'])
  currency?: string;
}