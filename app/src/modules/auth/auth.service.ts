import { Injectable, UnauthorizedException } from '@nestjs/common';
import { GetUserCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoService } from '../../config/cognito.config';
import { AuthEnvelopeService } from './services/auth-envelope.service';
import { BusinessInfoService, LocationInfo } from '../business-info/business-info.service';
import { Step1AuthResponse } from './dto/auth-step1.dto';
import { Step2AuthResponse, UserBusinessData } from './dto/auth-step2.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface CognitoUser {
  userId: string;
  username: string;
  email: string;
  businessId?: string;
  locationId?: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
}

export interface AuthResult {
  user: CognitoUser;
  accessToken: string;
  refreshToken?: string;
}

@Injectable()
export class AuthService {
  private cognitoClient = cognitoService.getClient();
  private config = cognitoService.getConfig();

  constructor(
    private readonly authEnvelopeService: AuthEnvelopeService,
    private readonly businessInfoService: BusinessInfoService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Validates a Cognito access token and returns user information
   */
  async validateAccessToken(accessToken: string): Promise<CognitoUser> {
    try {
      // In production, you would verify the JWT token signature and decode it
      // For now, we'll simulate token validation
      const userInfo = await this.getUserFromToken(accessToken);
      
      if (!userInfo) {
        throw new UnauthorizedException('Invalid access token');
      }

      return userInfo;
    } catch (error) {
      console.error('Token validation error:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Gets user information from Cognito using the username extracted from token
   */
  async getUserInfo(username: string): Promise<CognitoUser | null> {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.config.userPoolId,
        Username: username,
      });

      const result = await this.cognitoClient.send(command);
      
      if (!result.UserAttributes) {
        return null;
      }

      // Extract user attributes
      const attributes = result.UserAttributes.reduce((acc, attr) => {
        if (attr.Name && attr.Value) {
          acc[attr.Name] = attr.Value;
        }
        return acc;
      }, {} as Record<string, string>);

      return {
        userId: attributes.sub || username,
        username: result.Username || username,
        email: attributes.email || '',
        businessId: attributes['custom:business_id'],
        locationId: attributes['custom:location_id'],
        roles: this.parseJsonAttribute(attributes['custom:roles']) || ['user'],
        permissions: this.parseJsonAttribute(attributes['custom:permissions']) || [],
        isActive: result.Enabled || false,
      };
    } catch (error) {
      console.error(`Error fetching user info for ${username}:`, error);
      return null;
    }
  }

  /**
   * Validates user permissions for a specific action
   */
  async validatePermission(user: CognitoUser, permission: string): Promise<boolean> {
    return user.permissions.includes(permission) || user.roles.includes('admin');
  }

  /**
   * Validates that user has access to specific business and location
   */
  async validateBusinessAccess(user: CognitoUser, businessId: string, locationId?: string): Promise<boolean> {
    // Admin users can access all businesses
    if (user.roles.includes('admin') || user.roles.includes('super_admin')) {
      return true;
    }

    // Check if user belongs to the business
    if (user.businessId !== businessId) {
      return false;
    }

    // If location is specified, check location access
    if (locationId && user.locationId && user.locationId !== locationId) {
      // Check if user has cross-location permissions
      return user.permissions.includes('access:all_locations');
    }

    return true;
  }

  /**
   * Step 1: Creates authorization envelope and redirect URL
   */
  async createAuthorizationEnvelope(
    accessToken: string,
    clientId: string,
  ): Promise<Step1AuthResponse> {
    // Validate the Cognito access token
    const user = await this.validateAccessToken(accessToken);

    // Create authorization envelope
    const { envelope, redirectUrl } = await this.authEnvelopeService.createAuthEnvelope(
      user,
      clientId,
    );

    return {
      success: true,
      envelopeId: envelope.envelopeId,
      message: 'Authorization envelope created successfully',
      expiresAt: envelope.expiresAt,
      redirectUrl,
    };
  }

  /**
   * Step 2: Validates envelope and returns user-specific business data
   */
  async authorizeWithBusinessAccess(
    envelopeId: string,
    authCode: string,
    businessId: string,
    locationId?: string,
  ): Promise<Step2AuthResponse> {
    // Consume the authorization envelope
    const envelope = await this.authEnvelopeService.consumeEnvelope(
      envelopeId,
      authCode,
    );

    if (!envelope) {
      throw new UnauthorizedException('Invalid or expired authorization envelope');
    }

    // Get user information
    const user = await this.getUserInfo(envelope.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Validate business access
    const hasBusinessAccess = await this.validateBusinessAccess(
      user,
      businessId,
      locationId,
    );

    if (!hasBusinessAccess) {
      throw new UnauthorizedException(
        'User does not have access to this business or location',
      );
    }

    // Get business information
    const businessInfo = await this.businessInfoService.getBusinessInfo(businessId);
    if (!businessInfo) {
      throw new UnauthorizedException('Business not found');
    }

    // Get location information if specified
    let locationInfo: LocationInfo | null = null;
    if (locationId) {
      locationInfo = await this.businessInfoService.getLocationInfo(
        businessId,
        locationId,
      );
    }

    // Create user business data
    const userData: UserBusinessData = {
      userId: user.userId,
      email: user.email,
      roles: user.roles,
      business: {
        businessId: businessInfo.businessId,
        businessName: businessInfo.businessName,
        businessType: businessInfo.businessType,
      },
      location: locationInfo && locationInfo !== null
        ? {
            locationId: locationInfo.locationId,
            name: locationInfo.name,
            address: locationInfo.address,
            timezone: locationInfo.timezone,
          }
        : undefined,
    };

    // Generate JWT token with business context
    const accessToken = this.generateBusinessAccessToken(userData);
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    return {
      success: true,
      accessToken,
      userData,
      expiresAt,
    };
  }



  /**
   * Generates a JWT token with business context
   */
  private generateBusinessAccessToken(userData: UserBusinessData): string {
    const payload = {
      sub: userData.userId,
      email: userData.email,
      roles: userData.roles,
      businessId: userData.business.businessId,
      businessType: userData.business.businessType,
      locationId: userData.location?.locationId,
      type: 'business_access',
    };

    const expiresIn = this.configService.get('jwt.expiresIn', '1h');

    return this.jwtService.sign(payload, { expiresIn });
  }

  /**
   * Extracts user information from access token (simplified implementation)
   * In production, this would properly decode and validate the JWT
   */
  private async getUserFromToken(accessToken: string): Promise<CognitoUser | null> {
    try {
      // In a real implementation, you would:
      // 1. Verify the JWT signature using Cognito's public keys
      // 2. Check token expiration
      // 3. Extract the 'username' claim from the token
      // 4. Use that username to fetch full user details
      
      // For now, return mock user data for development
      return this.getMockUser(accessToken);
    } catch (error) {
      console.error('Error extracting user from token:', error);
      return null;
    }
  }

  /**
   * Mock user for development when Cognito is not available
   */
  private getMockUser(token: string): CognitoUser {
    // Extract some info from token for variety in testing
    const tokenHash = token.length % 4;
    const businessTypes = ['dental', 'gym', 'hotel'];
    const businessType = businessTypes[tokenHash];
    
    return {
      userId: `user-${tokenHash}`,
      username: `testuser${tokenHash}`,
      email: `user${tokenHash}@example.com`,
      businessId: `business-${tokenHash}`,
      locationId: `business-${tokenHash}-001`,
      roles: ['manager'],
      permissions: [
        'read:resources',
        'write:resources',
        'read:reports',
        businessType === 'dental' ? 'manage:appointments' : 
        businessType === 'gym' ? 'manage:memberships' : 'manage:reservations',
      ],
      isActive: true,
    };
  }

  /**
   * Helper function to parse JSON attributes from Cognito
   */
  private parseJsonAttribute(value: string | undefined): any {
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value.split(',').map(item => item.trim());
    }
  }
}
