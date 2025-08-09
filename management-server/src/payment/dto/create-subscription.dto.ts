import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsIn } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'Stripe price ID for the subscription plan' })
  @IsString()
  priceId: string;

  @ApiProperty({ description: 'Customer email address for billing' })
  @IsEmail()
  customerEmail: string;

  @ApiProperty({ description: 'Customer name' })
  @IsString()
  customerName: string;

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

  @ApiProperty({ 
    description: 'Existing customer ID (optional, will create new if not provided)',
    required: false 
  })
  @IsOptional()
  @IsString()
  customerId?: string;
}