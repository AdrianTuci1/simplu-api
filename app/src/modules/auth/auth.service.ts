import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoService } from '../../config/cognito.config';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceEntity } from '../resources/entities/resource.entity';
import { BusinessInfoService } from '../business-info/business-info.service';

export interface CognitoUser {
  userId: string; // Cognito's 'sub' claim
  username: string; // Cognito username
  email: string; // Cognito email
  name?: string; // Full name from Cognito (if available)
  firstName?: string; // Extracted first name
  lastName?: string; // Extracted last name
}

export interface AuthResult {
  user: CognitoUser;
  accessToken: string;
  refreshToken?: string;
}

export interface UserRole {
  locationId: string;
  locationName: string;
  roleName: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private cognitoClient = cognitoService.getClient();
  private config = cognitoService.getConfig();
  private jwksClient: jwksClient.JwksClient;

  constructor(
    @InjectRepository(ResourceEntity)
    private readonly resourceRepository: Repository<ResourceEntity>,
    private readonly businessInfoService: BusinessInfoService,
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
    this.logger.debug(
      `Validating access token: ${accessToken.substring(0, 20)}...`,
    );

    try {
      const userInfo = await this.getUserFromToken(accessToken);

      if (!userInfo) {
        this.logger.warn('Token validation failed: No user info returned');
        throw new UnauthorizedException('Invalid access token');
      }

      this.logger.log(
        `Token validated successfully for user: ${userInfo.userId}`,
      );
      return userInfo;
    } catch (error) {
      this.logger.error(
        `Token validation error: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException(
        `Invalid or expired token: ${error.message}`,
      );
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
      const [firstName, ...lastNameParts] = fullName.split(' ');

      return {
        userId: attributes.sub || '',
        username: attributes['cognito:username'] || username,
        email: attributes.email || '',
        name: fullName,
        firstName: firstName || '',
        lastName: lastNameParts.join(' ') || '',
      };
    } catch (error) {
      this.logger.error(
        `Error getting user info for ${username}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Extracts user information from access token using Cognito validation
   */
  private async getUserFromToken(
    accessToken: string,
  ): Promise<CognitoUser | null> {
    this.logger.debug('Extracting user from token using Cognito validation...');

    try {
      // 1. Verify the JWT signature using Cognito's public keys
      const decodedToken = await this.verifyJwtToken(accessToken);

      // 2. Extract username from token
      const username =
        decodedToken['cognito:username'] ||
        decodedToken.username ||
        decodedToken.sub;
      if (!username) {
        this.logger.warn('No username found in token');
        return null;
      }

      // 3. Fetch full user details from Cognito
      const userInfo = await this.getUserInfo(username);
      if (!userInfo) {
        this.logger.warn(`User not found in Cognito: ${username}`);
        return null;
      }

      this.logger.debug(`User info retrieved from Cognito: ${userInfo.userId}`);
      return userInfo;
    } catch (error) {
      this.logger.error(
        `Error extracting user from token: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Verifies JWT token using Cognito's public keys
   */
  private async verifyJwtToken(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        (header, callback) => {
          this.jwksClient.getSigningKey(header.kid, (err, key) => {
            if (err) {
              return callback(err);
            }
            const signingKey = key?.getPublicKey();
            callback(null, signingKey);
          });
        },
        {
          issuer: `https://cognito-idp.${this.config.region}.amazonaws.com/${this.config.userPoolId}`,
          audience: this.config.clientId,
        },
        (err, decoded) => {
          if (err) {
            reject(err);
          } else {
            resolve(decoded);
          }
        },
      );
    });
  }

  /**
   * Get all user roles from all locations in a business
   * Uses LIKE operator to search for business_location_id starting with businessId
   * This method queries the database directly to avoid circular dependencies
   */
  async getAllUserRolesFromBusiness(
    cognitoUserId: string,
    businessId: string,
  ): Promise<UserRole[]> {
    try {
      this.logger.debug(
        `Getting all roles for Cognito user ${cognitoUserId} in business ${businessId}`,
      );

      // Search for all medic resources where business_location_id starts with businessId
      // This will find resources from all locations in the business
      const medicResources = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.businessLocationId LIKE :businessPattern', {
          businessPattern: `${businessId}-%`,
        })
        .andWhere('resource.resourceType = :resourceType', { resourceType: 'medic' })
        .andWhere('resource.resourceId = :resourceId', { resourceId: cognitoUserId })
        .getMany();

      if (medicResources.length === 0) {
        this.logger.warn(
          `No medic resources found for Cognito user ${cognitoUserId} in business ${businessId}`,
        );
        return [];
      }

      const userRoles: UserRole[] = [];

      // Process each medic resource to extract role information
      for (const medicResource of medicResources) {
        try {
          const roleName = medicResource.data?.role;
          if (!roleName) {
            this.logger.warn(
              `No role found in medic resource for user ${cognitoUserId} in business location ${medicResource.businessLocationId}`,
            );
            continue;
          }

          // Extract locationId from businessLocationId (format: B010001-L010001)
          const businessLocationId = medicResource.businessLocationId;
          const locationId = businessLocationId.split('-')[1]; // Extract L010001 part
          
          // For now, use locationId as locationName (you might want to fetch this from a service)
          const locationName = locationId;

          userRoles.push({
            locationId,
            locationName,
            roleName,
          });

          this.logger.debug(
            `Found role ${roleName} for user ${cognitoUserId} in location ${locationId}`,
          );
        } catch (error) {
          this.logger.error(
            `Error processing medic resource for user ${cognitoUserId}: ${error.message}`,
          );
          continue;
        }
      }

      this.logger.debug(
        `Retrieved ${userRoles.length} roles for user ${cognitoUserId} in business ${businessId}`,
      );

      return userRoles;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error getting all user roles from business ${businessId}: ${errorMessage}`,
      );
      return [];
    }
  }

  /**
   * Get all user roles across all businesses and locations
   * Searches directly by resource_id without requiring businessId
   */
  async getAllUserRoles(cognitoUserId: string): Promise<Array<UserRole & { businessId: string; businessName: string }>> {
    try {
      this.logger.debug(
        `Getting all roles for Cognito user ${cognitoUserId} across all businesses`,
      );

      // Search for all medic resources by resource_id
      const medicResources = await this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.resourceType = :resourceType', { resourceType: 'medic' })
        .andWhere('resource.resourceId = :resourceId', { resourceId: cognitoUserId })
        .getMany();

      if (medicResources.length === 0) {
        this.logger.warn(
          `No medic resources found for Cognito user ${cognitoUserId}`,
        );
        return [];
      }

      const userRoles: Array<UserRole & { businessId: string; businessName: string }> = [];

      // Process each medic resource to extract role information
      for (const medicResource of medicResources) {
        try {
          const roleName = medicResource.data?.role;
          if (!roleName) {
            this.logger.warn(
              `No role found in medic resource for user ${cognitoUserId} in business location ${medicResource.businessLocationId}`,
            );
            continue;
          }

          // Extract businessId and locationId from businessLocationId (format: B010001-L010001)
          const businessLocationId = medicResource.businessLocationId;
          const [businessId, locationId] = businessLocationId.split('-');
          
          // Get business name and location name from DynamoDB business-info
          let businessName = businessId; // fallback to businessId
          let locationName = locationId; // fallback to locationId
          try {
            const businessInfo = await this.businessInfoService.getBusinessInfo(businessId);
            if (businessInfo) {
              // Get business name
              if (businessInfo.businessName) {
                businessName = businessInfo.businessName;
              }
              // Get location name
              if (businessInfo.locations) {
                const location = businessInfo.locations.find(loc => loc.id === locationId);
                if (location) {
                  locationName = location.name;
                }
              }
            }
          } catch (error) {
            this.logger.warn(
              `Failed to get business/location info for ${businessId}-${locationId}: ${error.message}`,
            );
            // Continue with businessId/locationId as fallback
          }

          userRoles.push({
            businessId,
            businessName,
            locationId,
            locationName,
            roleName,
          });

          this.logger.debug(
            `Found role ${roleName} for user ${cognitoUserId} in business ${businessId} (${businessName}), location ${locationId} (${locationName})`,
          );
        } catch (error) {
          this.logger.error(
            `Error processing medic resource for user ${cognitoUserId}: ${error.message}`,
          );
          continue;
        }
      }

      this.logger.debug(
        `Retrieved ${userRoles.length} roles for user ${cognitoUserId} across all businesses`,
      );

      return userRoles;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error getting all user roles for user ${cognitoUserId}: ${errorMessage}`,
      );
      return [];
    }
  }
}
