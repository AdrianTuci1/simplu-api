import { Controller, Get, UseGuards, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CognitoAuthGuard } from './guards/cognito-auth.guard';
import { AuthService, CognitoUser, UserRole } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Get('me')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile with all roles from all businesses and locations',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing Bearer token',
  })
  async getMe(@CurrentUser() user: CognitoUser) {
    try {
      // Get all user roles from all businesses and locations
      const userRoles = await this.authService.getAllUserRoles(user.userId);

      // Group roles by business
      const businessGroups = userRoles.reduce((acc, role) => {
        if (!acc[role.businessId]) {
          acc[role.businessId] = [];
        }
        acc[role.businessId].push({
          locationId: role.locationId,
          locationName: role.locationName,
          role: role.roleName,
        });
        return acc;
      }, {} as Record<string, Array<{ locationId: string; locationName: string; role: string }>>);

      return {
        success: true,
        user: {
          userId: user.userId,
          userName: user.username,
          email: user.email,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          businesses: Object.entries(businessGroups).map(([businessId, locations]) => ({
            businessId,
            locations,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve user roles',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('me/:businessId')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'businessId', description: 'Business ID to search for medic resources' })
  @ApiOperation({
    summary: 'Get current user profile with all roles from all locations in business',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing Bearer token',
  })
  async getMeByBusiness(
    @CurrentUser() user: CognitoUser,
    @Param('businessId') businessId: string,
  ) {
    try {
      // Get all user roles from all locations in this business
      const userRoles: UserRole[] = await this.authService.getAllUserRolesFromBusiness(
        user.userId,
        businessId,
      );

      return {
        success: true,
        user: {
          userId: user.userId,
          userName: user.username,
          email: user.email,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          businessId,
          locations: userRoles.map(role => ({
            locationId: role.locationId,
            locationName: role.locationName,
            role: role.roleName,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve user roles',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  healthCheck() {
    return {
      success: true,
      message: 'Auth service is healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
