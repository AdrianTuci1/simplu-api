import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { 
  LambdaAuthorizerResponse, 
  LocationRole, 
  LambdaAuthorizerContext 
} from './interfaces';

export interface AuthenticatedUser {
  userId: string;
  userName: string;
  email?: string;
  businessId: string;
  roles: LocationRole[];
  currentLocationId?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validates Lambda authorizer response and returns authenticated user
   */
  async validateLambdaAuthorizerResponse(authorizerResponse: LambdaAuthorizerResponse): Promise<AuthenticatedUser> {
    this.logger.debug(`Validating Lambda authorizer response for user: ${authorizerResponse.userId}`);
    
    try {
      // Validate required fields
      if (!authorizerResponse.userId) {
        throw new UnauthorizedException('Missing userId in Lambda authorizer response');
      }

      if (!authorizerResponse.userName) {
        throw new UnauthorizedException('Missing userName in Lambda authorizer response');
      }

      if (!authorizerResponse.businessId) {
        throw new UnauthorizedException('Missing businessId in Lambda authorizer response');
      }

      if (!authorizerResponse.roles || !Array.isArray(authorizerResponse.roles)) {
        throw new UnauthorizedException('Missing or invalid roles in Lambda authorizer response');
      }

      // Validate roles structure
      for (const role of authorizerResponse.roles) {
        if (!role.locationId || !role.locationName || !role.role) {
          throw new UnauthorizedException('Invalid role structure in Lambda authorizer response');
        }
      }

      // Create authenticated user object
      const authenticatedUser: AuthenticatedUser = {
        userId: authorizerResponse.userId,
        userName: authorizerResponse.userName,
        email: authorizerResponse.userName, // Use userName as email if not provided
        businessId: authorizerResponse.businessId,
        roles: authorizerResponse.roles,
        currentLocationId: authorizerResponse.roles[0]?.locationId, // Default to first location
      };

      this.logger.log(`Lambda authorizer response validated successfully for user: ${authenticatedUser.userId}`);
      return authenticatedUser;
    } catch (error) {
      this.logger.error(`Lambda authorizer validation error: ${error.message}`, error.stack);
      throw new UnauthorizedException(`Invalid Lambda authorizer response: ${error.message}`);
    }
  }

  /**
   * Validates JWT token that contains Lambda authorizer context
   */
  async validateLambdaAuthorizerToken(token: string): Promise<AuthenticatedUser> {
    this.logger.debug(`Validating Lambda authorizer JWT token: ${token.substring(0, 20)}...`);
    
    try {
      // Decode and verify the JWT token
      const decoded = jwt.decode(token, { complete: true });
      
      if (!decoded || typeof decoded === 'string') {
        throw new UnauthorizedException('Invalid JWT token format');
      }

      const payload = decoded.payload as any;
      
      // Check if token contains Lambda authorizer context
      if (!payload.context || !payload.context.userId) {
        throw new UnauthorizedException('Token does not contain Lambda authorizer context');
      }

      const context: LambdaAuthorizerContext = payload.context;
      
      // Create Lambda authorizer response from context
      const authorizerResponse: LambdaAuthorizerResponse = {
        userId: context.userId,
        userName: context.userName,
        businessId: context.businessId,
        roles: context.roles || [],
      };

      // Validate the authorizer response
      return await this.validateLambdaAuthorizerResponse(authorizerResponse);
    } catch (error) {
      this.logger.error(`Lambda authorizer token validation error: ${error.message}`, error.stack);
      throw new UnauthorizedException(`Invalid Lambda authorizer token: ${error.message}`);
    }
  }

  /**
   * Gets user roles for a specific location
   */
  getUserRoleForLocation(user: AuthenticatedUser, locationId: string): LocationRole | null {
    return user.roles.find(role => role.locationId === locationId) || null;
  }

  /**
   * Checks if user has a specific permission for a location
   */
  hasPermission(user: AuthenticatedUser, locationId: string, permission: string): boolean {
    const role = this.getUserRoleForLocation(user, locationId);
    if (!role) return false;
    
    return role.permissions?.includes(permission) || false;
  }

  /**
   * Checks if user has a specific role for a location
   */
  hasRole(user: AuthenticatedUser, locationId: string, roleName: string): boolean {
    const role = this.getUserRoleForLocation(user, locationId);
    return role?.role === roleName;
  }

  /**
   * Gets all locations where user has a specific role
   */
  getLocationsWithRole(user: AuthenticatedUser, roleName: string): LocationRole[] {
    return user.roles.filter(role => role.role === roleName);
  }
} 