import { Controller, Post, Body, UnauthorizedException, UseGuards, Get, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

interface LoginDto {
  email: string;
  password: string;
}

interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface RefreshTokenDto {
  refreshToken: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiHeader({ name: 'X-Tenant-ID', description: 'Tenant ID' })
  async login(@Body() loginDto: LoginDto, @Headers('x-tenant-id') tenantId: string) {
    const user = await this.authService.validateUserByEmail(
      loginDto.email,
      loginDto.password,
      tenantId,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @ApiHeader({ name: 'X-Tenant-ID', description: 'Tenant ID' })
  async refresh(@Body() refreshDto: RefreshTokenDto, @Headers('x-tenant-id') tenantId: string) {
    return this.authService.refreshToken(refreshDto.refreshToken, tenantId);
  }

  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiHeader({ name: 'X-Tenant-ID', description: 'Tenant ID' })
  async register(@Body() registerDto: RegisterDto, @Headers('x-tenant-id') tenantId: string) {
    const user = await this.authService.register(registerDto, tenantId);
    return this.authService.login(user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user data' })
  @ApiResponse({ status: 200, description: 'User data retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token' })
  @ApiHeader({ name: 'X-Tenant-ID', description: 'Tenant ID' })
  @ApiHeader({ name: 'X-Location-ID', description: 'Location ID' })
  async getCurrentUser(@Headers('authorization') token: string, @Headers('x-tenant-id') tenantId: string) {
    return this.authService.getCurrentUser(token, tenantId);
  }
} 