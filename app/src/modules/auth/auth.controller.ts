import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService, CognitoUser } from './auth.service';
import { Step1AuthRequest, Step1AuthResponse } from './dto/auth-step1.dto';
import { Step2AuthRequest, Step2AuthResponse } from './dto/auth-step2.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('validate')
  @ApiOperation({ summary: 'Validate access token and get user info' })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token from AWS Cognito',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Token is valid, returns user information',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired token',
  })
  async validateToken(
    @Headers('authorization') authorization: string,
  ): Promise<CognitoUser> {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token required');
    }

    const token = authorization.substring(7);
    return this.authService.validateAccessToken(token);
  }

  @Get('user')
  @ApiOperation({ summary: 'Get current user information' })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token from AWS Cognito',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully',
  })
  async getCurrentUser(
    @Headers('authorization') authorization: string,
  ): Promise<CognitoUser> {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token required');
    }

    const token = authorization.substring(7);
    return this.authService.validateAccessToken(token);
  }

  @Post('step1')
  @ApiOperation({
    summary: 'Step 1: Create authorization envelope and get redirect URL',
    description:
      'Gateway validates user token and creates an authorization envelope with temporary code. Returns redirect URL for the target client service.',
  })
  @ApiBody({ type: Step1AuthRequest })
  @ApiResponse({
    status: 200,
    description: 'Authorization envelope created successfully',
    type: Step1AuthResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired token',
  })
  async step1Authorization(
    @Body() request: Step1AuthRequest,
  ): Promise<Step1AuthResponse> {
    if (
      !request.authorization ||
      !request.authorization.startsWith('Bearer ')
    ) {
      throw new UnauthorizedException('Bearer token required');
    }

    const token = request.authorization.substring(7);
    return this.authService.createAuthorizationEnvelope(
      token,
      request.clientId,
    );
  }

  @Post('step2')
  @ApiOperation({
    summary:
      'Step 2: Authorize with business access and get user-specific data',
    description:
      'Client uses envelope ID, auth code, and business ID to get authorization and user-specific business data.',
  })
  @ApiBody({ type: Step2AuthRequest })
  @ApiResponse({
    status: 200,
    description:
      'Authorization successful, returns user business data and access token',
    type: Step2AuthResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid envelope, auth code, or unauthorized for business',
  })
  async step2Authorization(
    @Body() request: Step2AuthRequest,
  ): Promise<Step2AuthResponse> {
    return this.authService.authorizeWithBusinessAccess(
      request.envelopeId,
      request.authCode,
      request.businessId,
      request.locationId,
    );
  }
}
