import { Controller, Get, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LambdaAuthorizerGuard } from '../guards/lambda-authorizer.guard';
import { CurrentUser, Public } from '../decorators';
import { AuthenticatedUser } from '../auth.service';

@ApiTags('examples')
@Controller('examples')
export class UsageExamplesController {

  // ============================================================================
  // EXEMPLU 1: Endpoint public (nu necesită autentificare)
  // ============================================================================
  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Public endpoint example' })
  @ApiResponse({ status: 200, description: 'Public data returned' })
  async publicEndpoint() {
    return {
      message: 'This is a public endpoint - no authentication required',
      timestamp: new Date().toISOString()
    };
  }

  // ============================================================================
  // EXEMPLU 2: Endpoint protejat cu autentificare
  // ============================================================================
  @Get('protected')
  @UseGuards(LambdaAuthorizerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Protected endpoint example' })
  @ApiResponse({ status: 200, description: 'Protected data returned' })
  async protectedEndpoint(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'This is a protected endpoint',
      user: {
        userId: user.userId,
        userName: user.userName,
        businessId: user.businessId,
        roles: user.roles
      },
      timestamp: new Date().toISOString()
    };
  }

  // ============================================================================
  // EXEMPLU 3: Endpoint cu validare business ID
  // ============================================================================
  @Get('business/:businessId')
  @UseGuards(LambdaAuthorizerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Business-specific endpoint example' })
  @ApiResponse({ status: 200, description: 'Business data returned' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async businessSpecificEndpoint(
    @CurrentUser() user: AuthenticatedUser,
    businessId: string
  ) {
    // Validare că utilizatorul are acces la acest business
    if (user.businessId !== businessId) {
      throw new HttpException('Access denied: Invalid business ID', HttpStatus.FORBIDDEN);
    }

    return {
      message: `Access granted to business: ${businessId}`,
      user: {
        userId: user.userId,
        userName: user.userName,
        businessId: user.businessId
      },
      timestamp: new Date().toISOString()
    };
  }

  // ============================================================================
  // EXEMPLU 4: Endpoint cu validare rol pentru locație
  // ============================================================================
  @Get('location/:locationId')
  @UseGuards(LambdaAuthorizerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Location-specific endpoint example' })
  @ApiResponse({ status: 200, description: 'Location data returned' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async locationSpecificEndpoint(
    @CurrentUser() user: AuthenticatedUser,
    locationId: string
  ) {
    // Verificare dacă utilizatorul are rol pentru această locație
    const userRole = user.roles.find(role => role.locationId === locationId);
    
    if (!userRole) {
      throw new HttpException('Access denied: No access to this location', HttpStatus.FORBIDDEN);
    }

    return {
      message: `Access granted to location: ${locationId}`,
      userRole: {
        locationId: userRole.locationId,
        locationName: userRole.locationName,
        role: userRole.role,
        permissions: userRole.permissions
      },
      timestamp: new Date().toISOString()
    };
  }

  // ============================================================================
  // EXEMPLU 5: Endpoint cu validare permisiuni
  // ============================================================================
  @Post('admin-action')
  @UseGuards(LambdaAuthorizerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin action endpoint example' })
  @ApiResponse({ status: 200, description: 'Admin action completed' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async adminActionEndpoint(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { locationId: string; action: string }
  ) {
    const { locationId, action } = body;

    // Verificare dacă utilizatorul are rol pentru această locație
    const userRole = user.roles.find(role => role.locationId === locationId);
    
    if (!userRole) {
      throw new HttpException('Access denied: No access to this location', HttpStatus.FORBIDDEN);
    }

    // Verificare dacă utilizatorul are permisiunea necesară
    if (!userRole.permissions?.includes('admin')) {
      throw new HttpException('Access denied: Admin permission required', HttpStatus.FORBIDDEN);
    }

    return {
      message: `Admin action '${action}' completed for location: ${locationId}`,
      userRole: {
        locationId: userRole.locationId,
        locationName: userRole.locationName,
        role: userRole.role
      },
      action,
      timestamp: new Date().toISOString()
    };
  }

  // ============================================================================
  // EXEMPLU 6: Endpoint cu filtrare după roluri
  // ============================================================================
  @Get('my-locations')
  @UseGuards(LambdaAuthorizerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user locations example' })
  @ApiResponse({ status: 200, description: 'User locations returned' })
  async getUserLocations(@CurrentUser() user: AuthenticatedUser) {
    // Grupare locații după rol
    const locationsByRole = user.roles.reduce((acc, role) => {
      if (!acc[role.role]) {
        acc[role.role] = [];
      }
      acc[role.role].push({
        locationId: role.locationId,
        locationName: role.locationName,
        permissions: role.permissions
      });
      return acc;
    }, {} as Record<string, any[]>);

    return {
      message: 'User locations retrieved successfully',
      businessId: user.businessId,
      totalLocations: user.roles.length,
      locationsByRole,
      timestamp: new Date().toISOString()
    };
  }

  // ============================================================================
  // EXEMPLU 7: Endpoint cu validare complexă
  // ============================================================================
  @Post('complex-validation')
  @UseGuards(LambdaAuthorizerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complex validation endpoint example' })
  @ApiResponse({ status: 200, description: 'Complex validation passed' })
  @ApiResponse({ status: 403, description: 'Validation failed' })
  async complexValidationEndpoint(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { 
      businessId: string; 
      locationId: string; 
      requiredRole: string; 
      requiredPermission: string;
    }
  ) {
    const { businessId, locationId, requiredRole, requiredPermission } = body;

    // Validare business ID
    if (user.businessId !== businessId) {
      throw new HttpException('Access denied: Invalid business ID', HttpStatus.FORBIDDEN);
    }

    // Validare locație și rol
    const userRole = user.roles.find(role => role.locationId === locationId);
    
    if (!userRole) {
      throw new HttpException('Access denied: No access to this location', HttpStatus.FORBIDDEN);
    }

    if (userRole.role !== requiredRole) {
      throw new HttpException(`Access denied: Required role '${requiredRole}' not found`, HttpStatus.FORBIDDEN);
    }

    // Validare permisiune
    if (!userRole.permissions?.includes(requiredPermission)) {
      throw new HttpException(`Access denied: Required permission '${requiredPermission}' not found`, HttpStatus.FORBIDDEN);
    }

    return {
      message: 'Complex validation passed successfully',
      validation: {
        businessId: 'valid',
        locationId: 'valid',
        role: 'valid',
        permission: 'valid'
      },
      userInfo: {
        userId: user.userId,
        userName: user.userName,
        businessId: user.businessId,
        locationRole: {
          locationId: userRole.locationId,
          locationName: userRole.locationName,
          role: userRole.role,
          permissions: userRole.permissions
        }
      },
      timestamp: new Date().toISOString()
    };
  }
} 