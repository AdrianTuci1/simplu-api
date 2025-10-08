import { Controller, Get, Post, Body, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, CognitoUser } from './auth.service';
import { CognitoAuthGuard } from './guards/cognito-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('validate-token')
  @ApiOperation({ summary: 'Validate access token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  async validateToken(@Body() body: { accessToken: string }) {
    try {
      const user = await this.authService.validateAccessToken(body.accessToken);
      return {
        success: true,
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          groups: user.groups,
        },
      };
    } catch (error) {
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }
  }

  @Get('profile')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getProfile(@Request() req: any) {
    const user = req.user as CognitoUser;
    return {
      success: true,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        groups: user.groups,
      },
    };
  }




} 