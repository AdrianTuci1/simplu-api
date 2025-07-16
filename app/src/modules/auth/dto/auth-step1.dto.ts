import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class Step1AuthRequest {
  @ApiProperty({ 
    description: 'Bearer token from AWS Cognito',
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @IsString()
  @IsNotEmpty()
  authorization: string;

  @ApiProperty({ 
    description: 'Client identifier for the requesting client',
    example: 'web-app'
  })
  @IsString()
  @IsNotEmpty()
  clientId: string;
}

export class AuthEnvelope {
  @ApiProperty({ 
    description: 'Unique envelope ID for tracking',
    example: 'env_123456789'
  })
  @IsString()
  @IsUUID()
  envelopeId: string;

  @ApiProperty({ 
    description: 'User ID from the authenticated token',
    example: 'user-123'
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ 
    description: 'Temporary authorization code (expires in 1 min)',
    example: 'abc123xyz'
  })
  @IsString()
  @IsNotEmpty()
  authCode: string;

  @ApiProperty({ 
    description: 'Client ID that requested the authorization',
    example: 'web-app'
  })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ 
    description: 'Timestamp when the envelope was created',
    example: '2024-01-15T10:30:00Z'
  })
  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @ApiProperty({ 
    description: 'Expiration timestamp (1 minute from creation)',
    example: '2024-01-15T10:31:00Z'
  })
  @IsString()
  @IsNotEmpty()
  expiresAt: string;
}

export class Step1AuthResponse {
  @ApiProperty({ 
    description: 'Whether the envelope was sent successfully',
    example: true
  })
  success: boolean;

  @ApiProperty({ 
    description: 'Unique envelope ID for the client to reference',
    example: 'env_123456789'
  })
  @IsString()
  @IsUUID()
  envelopeId: string;

  @ApiProperty({ 
    description: 'Message describing the result',
    example: 'Authorization envelope sent successfully'
  })
  @IsString()
  message: string;

  @ApiProperty({ 
    description: 'Expiration time for the authorization code',
    example: '2024-01-15T10:31:00Z'
  })
  @IsString()
  expiresAt: string;

  @ApiProperty({ 
    description: 'Redirect URL for the client service',
    example: 'http://localhost:3000/auth/step2?envelope_id=env_123456789&auth_code=abc123xyz&user_id=user-123&expires_at=2024-01-15T10:31:00Z'
  })
  @IsString()
  redirectUrl: string;
} 