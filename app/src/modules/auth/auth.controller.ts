import { Controller, Get, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

interface AuthorizerHeaders {
  'x-authorizer-user-id'?: string;
  'x-authorizer-user-name'?: string;
  'x-authorizer-business-id'?: string;
  'x-authorizer-roles'?: string;
}

interface RoleData {
  locationId: string;
  locationName: string;
  role: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor() {}

  @Get('me')
  @ApiOperation({
    summary:
      'Get current user profile with all locations and roles from authorizer',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  getMe(@Headers() headers: AuthorizerHeaders) {
    // Extract user data from Lambda authorizer headers
    const userId = headers['x-authorizer-user-id'];
    const userName = headers['x-authorizer-user-name'];
    const businessId = headers['x-authorizer-business-id'];
    const rolesHeader = headers['x-authorizer-roles'];

    // If no authorizer data, return error
    if (!userId || !userName || !businessId || !rolesHeader) {
      return {
        success: false,
        error: 'Missing authorizer data',
        message: 'User data not available from Lambda authorizer',
      };
    }

    try {
      // Parse roles from header
      const roles = JSON.parse(rolesHeader) as RoleData[];

      if (!Array.isArray(roles)) {
        return {
          success: false,
          error: 'Invalid roles format',
          message: 'Roles must be an array',
        };
      }

      // Map roles to locations format
      const locations = roles.map((role: RoleData) => ({
        locationId: role.locationId,
        locationName: role.locationName,
        role: role.role,
      }));

      return {
        success: true,
        user: {
          userId,
          userName,
          email: userName, // Use userName as email if not provided
          businessId,
          locations,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: 'Failed to parse authorizer data',
        message: errorMessage,
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
