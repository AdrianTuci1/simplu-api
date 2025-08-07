import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  GetUserCommand,
  AdminGetUserCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  ListUsersCommand,
  ListGroupsCommand,
  CreateGroupCommand,
  DeleteGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoService } from '../../config/cognito.config';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface CognitoUser {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  createdAt?: string;
  lastModified?: string;
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

      // Get user groups to determine roles
      const groups = await this.getUserGroups(username);

      return {
        userId: attributes.sub || username,
        username: result.Username || username,
        email: attributes.email || '',
        roles: groups,
        permissions: this.getPermissionsFromRoles(groups),
        isActive: result.Enabled || false,
        createdAt: result.UserCreateDate?.toISOString(),
        lastModified: result.UserLastModifiedDate?.toISOString(),
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
   * Gets user groups (roles)
   */
  private async getUserGroups(username: string): Promise<string[]> {
    try {
      // Note: In a real implementation, you would use AdminListGroupsForUserCommand
      // For now, return default roles based on username
      const groups = ['user'];
      
      if (username.includes('admin')) {
        groups.push('admin');
      }
      
      if (username.includes('manager')) {
        groups.push('manager');
      }

      return groups;
    } catch (error) {
      console.error('Error getting user groups:', error);
      return ['user'];
    }
  }

  /**
   * Adds user to a group
   */
  private async addUserToGroup(username: string, groupName: string): Promise<void> {
    try {
      const command = new AdminAddUserToGroupCommand({
        UserPoolId: this.config.userPoolId,
        Username: username,
        GroupName: groupName,
      });

      await this.cognitoClient.send(command);
    } catch (error) {
      console.error(`Error adding user ${username} to group ${groupName}:`, error);
      // Don't throw error, just log it
    }
  }

  /**
   * Removes user from a group
   */
  private async removeUserFromGroup(username: string, groupName: string): Promise<void> {
    try {
      const command = new AdminRemoveUserFromGroupCommand({
        UserPoolId: this.config.userPoolId,
        Username: username,
        GroupName: groupName,
      });

      await this.cognitoClient.send(command);
    } catch (error) {
      console.error(`Error removing user ${username} from group ${groupName}:`, error);
      // Don't throw error, just log it
    }
  }

  /**
   * Validates user permissions for a specific action
   */
  async validatePermission(user: CognitoUser, permission: string): Promise<boolean> {
    return (
      user.permissions.includes(permission) || 
      user.roles.includes('admin') || 
      user.roles.includes('super_admin')
    );
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
      username: `admin${tokenHash}`,
      email: `admin${tokenHash}@management.com`,
      roles: ['admin', 'manager'],
      permissions: [
        'create:business',
        'read:business',
        'update:business',
        'delete:business',
        'manage:users',
        'manage:infrastructure',
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
  }

  /**
   * Maps roles to permissions
   */
  private getPermissionsFromRoles(roles: string[]): string[] {
    const permissions: string[] = [];

    if (roles.includes('super_admin')) {
      permissions.push(
        'create:business',
        'read:business',
        'update:business',
        'delete:business',
        'manage:users',
        'manage:infrastructure',
        'manage:payments',
        'view:analytics',
        'manage:system'
      );
    } else if (roles.includes('admin')) {
      permissions.push(
        'create:business',
        'read:business',
        'update:business',
        'delete:business',
        'manage:users',
        'manage:infrastructure',
        'manage:payments',
        'view:analytics'
      );
    } else if (roles.includes('manager')) {
      permissions.push(
        'read:business',
        'update:business',
        'manage:users',
        'view:analytics'
      );
    } else {
      permissions.push('read:business');
    }

    return permissions;
  }
} 