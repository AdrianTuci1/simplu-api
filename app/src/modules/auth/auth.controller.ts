import { Controller, Get, Post, Body, UseGuards, Request, HttpException, HttpStatus, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, AuthenticatedUser } from './auth.service';
import { LambdaAuthorizerGuard } from './guards/lambda-authorizer.guard';
import { LambdaAuthorizerResponse } from './interfaces';
import { Public, CurrentUser } from './decorators';
import { PermissionService } from '../resources/services/permission.service';
import { ResourceType, ResourceAction } from '../resources/types/base-resource';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly permissionService: PermissionService,
  ) {}

  @Post('validate-lambda-authorizer')
  @ApiOperation({ summary: 'Validate Lambda authorizer response' })
  @ApiResponse({ status: 200, description: 'Lambda authorizer response is valid' })
  @ApiResponse({ status: 401, description: 'Invalid Lambda authorizer response' })
  async validateLambdaAuthorizer(@Body() authorizerResponse: LambdaAuthorizerResponse) {
    try {
      const user = await this.authService.validateLambdaAuthorizerResponse(authorizerResponse);
      return {
        success: true,
        user: {
          userId: user.userId,
          userName: user.userName,
          email: user.email,
          businessId: user.businessId,
          roles: user.roles,
          currentLocationId: user.currentLocationId,
        },
      };
    } catch (error) {
      throw new HttpException('Invalid Lambda authorizer response', HttpStatus.UNAUTHORIZED);
    }
  }

  @Get('profile')
  @UseGuards(LambdaAuthorizerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      user: {
        userId: user.userId,
        userName: user.userName,
        email: user.email,
        businessId: user.businessId,
        roles: user.roles,
        currentLocationId: user.currentLocationId,
      },
    };
  }

  @Get('roles')
  @UseGuards(LambdaAuthorizerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user roles for all locations' })
  @ApiResponse({ status: 200, description: 'User roles retrieved successfully' })
  async getUserRoles(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      roles: user.roles,
    };
  }

  @Get('roles/:locationId')
  @UseGuards(LambdaAuthorizerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user role for specific location' })
  @ApiResponse({ status: 200, description: 'User role retrieved successfully' })
  async getUserRoleForLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Request() req: any,
  ) {
    const locationId = req.params.locationId;
    const role = this.authService.getUserRoleForLocation(user, locationId);
    
    if (!role) {
      throw new HttpException('User has no role for this location', HttpStatus.FORBIDDEN);
    }

    return {
      success: true,
      role,
    };
  }

  @Get('permissions/:locationId')
  @UseGuards(LambdaAuthorizerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user permissions for specific location' })
  @ApiResponse({ status: 200, description: 'User permissions retrieved successfully' })
  async getUserPermissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('locationId') locationId: string,
  ) {
    const permissions = await this.permissionService.getUserPermissions(user, locationId);
    
    return {
      success: true,
      locationId,
      permissions,
      totalPermissions: permissions.length,
    };
  }

  @Get('permissions')
  @UseGuards(LambdaAuthorizerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user permissions for all locations' })
  @ApiResponse({ status: 200, description: 'User permissions retrieved successfully' })
  async getUserPermissionsAllLocations(@CurrentUser() user: AuthenticatedUser) {
    const permissionsByLocation = await this.permissionService.getUserPermissionsAllLocations(user);
    
    return {
      success: true,
      permissionsByLocation,
      totalLocations: Object.keys(permissionsByLocation).length,
    };
  }

  @Post('check-permission/:locationId/:resourceType/:action')
  @UseGuards(LambdaAuthorizerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user has specific permission' })
  @ApiResponse({ status: 200, description: 'Permission check completed' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  async checkPermission(
    @CurrentUser() user: AuthenticatedUser,
    @Param('locationId') locationId: string,
    @Param('resourceType') resourceType: ResourceType,
    @Param('action') action: ResourceAction,
  ) {
    try {
      await this.permissionService.checkPermission(user, locationId, resourceType, action);
      
      return {
        success: true,
        message: `Permission granted: ${resourceType}:${action}`,
        locationId,
        resourceType,
        action,
        permission: `${resourceType}:${action}`,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.FORBIDDEN);
    }
  }

  @Post('test-permissions/:locationId')
  @UseGuards(LambdaAuthorizerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test multiple permissions for a location' })
  @ApiResponse({ status: 200, description: 'Permission tests completed' })
  async testPermissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('locationId') locationId: string,
    @Body() body: { permissions: Array<{ resourceType: ResourceType; action: ResourceAction }> },
  ) {
    const results: Array<{
      permission: string;
      granted: boolean;
      error: string | null;
    }> = [];
    
    for (const permission of body.permissions) {
      try {
        await this.permissionService.checkPermission(
          user, 
          locationId, 
          permission.resourceType, 
          permission.action
        );
        
        results.push({
          permission: `${permission.resourceType}:${permission.action}`,
          granted: true,
          error: null,
        });
      } catch (error) {
        results.push({
          permission: `${permission.resourceType}:${permission.action}`,
          granted: false,
          error: error.message,
        });
      }
    }
    
    const grantedCount = results.filter(r => r.granted).length;
    const deniedCount = results.filter(r => !r.granted).length;
    
    return {
      success: true,
      locationId,
      results,
      summary: {
        total: results.length,
        granted: grantedCount,
        denied: deniedCount,
      },
    };
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    return {
      success: true,
      message: 'Auth service is healthy',
      timestamp: new Date().toISOString(),
    };
  }
} 