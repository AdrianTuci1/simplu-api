import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import {
  AdminGetUserCommand,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoService } from '../../config/cognito.config';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

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
  private readonly logger = new Logger(AuthService.name);
  private cognitoClient = cognitoService.getClient();
  private config = cognitoService.getConfig();
  private jwksClient: jwksClient.JwksClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    // Initialize JWKS client for token verification
    this.jwksClient = jwksClient({
      jwksUri: `https://cognito-idp.${this.config.region}.amazonaws.com/${this.config.userPoolId}/.well-known/jwks.json`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
    });
  }

  /**
   * Validates a Cognito access token and returns user information
   */
  async validateAccessToken(accessToken: string): Promise<CognitoUser> {
    this.logger.debug(`Validating access token: ${accessToken.substring(0, 20)}...`);
    
    try {
      const userInfo = await this.getUserFromToken(accessToken);

      if (!userInfo) {
        this.logger.warn('Token validation failed: No user info returned');
        throw new UnauthorizedException('Invalid access token');
      }

      this.logger.log(`Token validated successfully for user: ${userInfo.userId}`);
      return userInfo;
    } catch (error) {
      this.logger.error(`Token validation error: ${error.message}`, error.stack);
      throw new UnauthorizedException(`Invalid or expired token: ${error.message}`);
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
   * Extracts user information from access token using Cognito validation
   */
  private async getUserFromToken(accessToken: string): Promise<CognitoUser | null> {
    this.logger.debug('Extracting user from token using Cognito validation...');
    
    try {
      // 1. Verify the JWT signature using Cognito's public keys
      const decodedToken = await this.verifyToken(accessToken);
      
      if (!decodedToken) {
        this.logger.warn('Token verification failed');
        return null;
      }

      // 2. Extract username from token
      const username = decodedToken['cognito:username'] || decodedToken.username || decodedToken.sub;
      
      if (!username) {
        this.logger.warn('No username found in token');
        return null;
      }

      this.logger.debug(`Username extracted from token: ${username}`);

      // 3. Fetch full user details from Cognito
      const userInfo = await this.getUserInfo(username);
      
      if (!userInfo) {
        this.logger.warn(`User not found in Cognito: ${username}`);
        return null;
      }

      this.logger.debug(`User info retrieved from Cognito: ${userInfo.userId}`);
      return userInfo;
    } catch (error) {
      this.logger.error(`Error extracting user from token: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Verifies JWT token using Cognito's public keys
   */
  private async verifyToken(token: string): Promise<any> {
    try {
      // Decode token header to get key ID
      const decodedHeader = jwt.decode(token, { complete: true });
      
      if (!decodedHeader || typeof decodedHeader === 'string') {
        this.logger.warn('Invalid token format');
        return null;
      }

      const kid = decodedHeader.header.kid;
      
      if (!kid) {
        this.logger.warn('No key ID found in token header');
        return null;
      }

      // Get the public key
      const key = await this.jwksClient.getSigningKey(kid);
      const publicKey = key.getPublicKey();

      // Verify the token signature and basic claims
      const decoded = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: `https://cognito-idp.${this.config.region}.amazonaws.com/${this.config.userPoolId}`,
      });

      // Check client_id instead of aud
      if (typeof decoded === 'string') {
        this.logger.warn('Token decoded as string, expected object');
        throw new Error('Invalid token format');
      }
      
      if (decoded.client_id !== this.config.clientId) {
        this.logger.warn(`Invalid client_id: expected ${this.config.clientId}, got ${decoded.client_id}`);
        throw new Error('Invalid audience: Client ID mismatch.');
      }

      this.logger.debug('Token verified successfully');
      return decoded;
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      return null;
    }
  }


} 