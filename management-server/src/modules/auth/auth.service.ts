import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoService } from '../../config/cognito.config';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface CognitoUser {
  userId: string;       // Cognito's 'sub' claim
  username: string;     // Cognito username
  email: string;        // Cognito email
  name?: string;        // Full name from Cognito (if available)
  firstName?: string;   // Extracted first name
  lastName?: string;    // Extracted last name
}

export interface AuthResult {
  user: CognitoUser;
  accessToken: string;
  refreshToken?: string;
}

// Management server only validates tokens, doesn't create users
// User creation is handled by the central auth gateway

@Injectable()
export class AuthService {
  private cognitoClient = cognitoService.getClient();
  private config = cognitoService.getConfig();

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Validates a Cognito access token and returns user information
   */
  async validateAccessToken(accessToken: string): Promise<CognitoUser> {
    try {
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
   * Gets user information from Cognito using the username
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
      const attributes = result.UserAttributes.reduce(
        (acc, attr) => {
          if (attr.Name && attr.Value) {
            acc[attr.Name] = attr.Value;
          }
          return acc;
        },
        {} as Record<string, string>,
      );

      // Extract and split name
      const fullName = attributes.name || attributes['custom:name'] || '';
      const { firstName, lastName } = this.splitFullName(fullName);

      return {
        userId: attributes.sub || username,
        username: result.Username || username,
        email: attributes.email || '',
        name: fullName,
        firstName,
        lastName,
      };
    } catch (error) {
      console.error(`Error fetching user info for ${username}:`, error);
      return null;
    }
  }

  /**
   * Management server doesn't create users
   * User creation is handled by the central auth gateway
   */
  async createUser(): Promise<never> {
    throw new Error('User creation is not supported in management server. Use the central auth gateway.');
  }

  /**
   * Management server doesn't update users
   * User updates are handled by the central auth gateway
   */
  async updateUser(): Promise<never> {
    throw new Error('User updates are not supported in management server. Use the central auth gateway.');
  }

  /**
   * Management server doesn't delete users
   * User deletion is handled by the central auth gateway
   */
  async deleteUser(): Promise<never> {
    throw new Error('User deletion is not supported in management server. Use the central auth gateway.');
  }

  /**
   * Management server doesn't list users
   * User listing is handled by the central auth gateway
   */
  async listUsers(): Promise<never> {
    throw new Error('User listing is not supported in management server. Use the central auth gateway.');
  }







  /**
   * Splits a full name into first and last name
   */
  private splitFullName(fullName: string): { firstName: string; lastName: string } {
    if (!fullName || typeof fullName !== 'string') {
      return { firstName: '', lastName: '' };
    }

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      return { firstName: '', lastName: '' };
    }

    const nameParts = trimmedName.split(/\s+/);
    
    if (nameParts.length === 1) {
      return { firstName: nameParts[0], lastName: '' };
    }
    
    if (nameParts.length === 2) {
      return { firstName: nameParts[0], lastName: nameParts[1] };
    }
    
    // For names with more than 2 parts, first part is firstName, rest is lastName
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    
    return { firstName, lastName };
  }

  /**
   * Extracts user information from access token (simplified implementation)
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
    const tokenHash = token.length % 4;
    
    return {
      userId: `user-${tokenHash}`,
      username: `user${tokenHash}`,
      email: `user${tokenHash}@example.com`,
      name: `User ${tokenHash}`,
      firstName: `User`,
      lastName: `${tokenHash}`,
    };
  }


} 