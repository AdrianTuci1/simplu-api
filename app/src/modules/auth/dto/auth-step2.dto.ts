import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class Step2AuthRequest {
  @ApiProperty({
    description: 'Envelope ID from step 1',
    example: 'env_123456789',
  })
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  envelopeId: string;

  @ApiProperty({
    description: 'Authorization code from the envelope (expires in 1 min)',
    example: 'abc123xyz',
  })
  @IsString()
  @IsNotEmpty()
  authCode: string;

  @ApiProperty({
    description: 'Business ID to authorize access for',
    example: 'business-456',
  })
  @IsString()
  @IsNotEmpty()
  businessId: string;

  @ApiProperty({
    description: 'Optional location ID within the business',
    example: 'business-456-001',
    required: false,
  })
  @IsString()
  @IsOptional()
  locationId?: string;
}

export class UserBusinessData {
  @ApiProperty({
    description: 'User ID',
    example: 'user-123',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  @IsString()
  email: string;

  @ApiProperty({
    description: 'User roles for this business',
    example: ['manager', 'staff'],
  })
  roles: string[];

  @ApiProperty({
    description: 'Business information',
    example: {
      businessId: 'business-456',
      businessName: 'Dental Practice ABC',
      businessType: 'dental',
    },
  })
  business: {
    businessId: string;
    businessName: string;
    businessType: string;
  };

  @ApiProperty({
    description: 'Location information if specified',
    required: false,
    example: {
      locationId: 'business-456-001',
      name: 'Main Office',
      address: '123 Main St',
    },
  })
  location?: {
    locationId: string;
    name: string;
    address: string;
    timezone: string;
  };
}

export class Step2AuthResponse {
  @ApiProperty({
    description: 'Whether the authorization was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'JWT token for authenticated requests',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'User and business-specific data',
  })
  userData: UserBusinessData;

  @ApiProperty({
    description: 'Token expiration time',
    example: '2024-01-15T11:30:00Z',
  })
  expiresAt: string;
}
