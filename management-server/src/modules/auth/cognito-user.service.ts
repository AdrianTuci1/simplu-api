import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AuthFlowType,
  MessageActionType,
  UserStatusType,
} from '@aws-sdk/client-cognito-identity-provider';
// import { EmailService } from '../../shared/services/email.service'; // Removed to avoid circular dependency

@Injectable()
export class CognitoUserService {
  private readonly logger = new Logger(CognitoUserService.name);
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly clientId: string;

  constructor(
    private readonly configService: ConfigService,
    // private readonly emailService: EmailService, // Removed to avoid circular dependency
  ) {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.configService.get('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    
    this.userPoolId = this.configService.get('COGNITO_USER_POOL_ID');
    this.clientId = this.configService.get('COGNITO_CLIENT_ID');
  }

  /**
   * Create a new user in Cognito with a temporary password
   */
  async createUserWithTemporaryPassword(
    email: string,
    firstName?: string,
    lastName?: string,
    businessName?: string
  ): Promise<{ username: string; temporaryPassword: string }> {
    try {
      // Generate a temporary password
      const temporaryPassword = this.generateTemporaryPassword();
      
      const command = new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        UserAttributes: [
          {
            Name: 'email',
            Value: email,
          },
          {
            Name: 'email_verified',
            Value: 'true',
          },
          ...(firstName ? [{ Name: 'given_name', Value: firstName }] : []),
          ...(lastName ? [{ Name: 'family_name', Value: lastName }] : []),
          ...(businessName ? [{ Name: 'custom:business_name', Value: businessName }] : []),
        ],
        TemporaryPassword: temporaryPassword,
        MessageAction: MessageActionType.SUPPRESS, // Don't send Cognito's default email
        DesiredDeliveryMediums: ['EMAIL'],
      });

      const result = await this.cognitoClient.send(command);
      
      this.logger.log(`User created in Cognito: ${email}`);
      
      // Note: Email with temporary password will be sent by the business service
      // which calls the EmailService.sendBusinessInvitationEmail with the password

      return {
        username: result.User?.Username || email,
        temporaryPassword,
      };
    } catch (error) {
      this.logger.error(`Error creating user in Cognito: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Set a permanent password for a user
   */
  async setUserPassword(username: string, password: string): Promise<void> {
    try {
      const command = new AdminSetUserPasswordCommand({
        UserPoolId: this.userPoolId,
        Username: username,
        Password: password,
        Permanent: true,
      });

      await this.cognitoClient.send(command);
      this.logger.log(`Password set for user: ${username}`);
    } catch (error) {
      this.logger.error(`Error setting password for user ${username}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Initiate password change for a user (requires current password)
   */
  async initiatePasswordChange(
    username: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      // First, authenticate the user
      const authCommand = new AdminInitiateAuthCommand({
        UserPoolId: this.userPoolId,
        ClientId: this.clientId,
        AuthFlow: AuthFlowType.ADMIN_NO_SRP_AUTH,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: currentPassword,
        },
      });

      const authResult = await this.cognitoClient.send(authCommand);
      
      // If authentication successful, proceed with password change
      if (authResult.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
        const respondCommand = new AdminRespondToAuthChallengeCommand({
          UserPoolId: this.userPoolId,
          ClientId: this.clientId,
          ChallengeName: 'NEW_PASSWORD_REQUIRED',
          Session: authResult.Session,
          ChallengeResponses: {
            USERNAME: username,
            NEW_PASSWORD: newPassword,
          },
        });

        await this.cognitoClient.send(respondCommand);
        this.logger.log(`Password changed successfully for user: ${username}`);
      } else {
        // User is already authenticated, set new password directly
        await this.setUserPassword(username, newPassword);
      }
    } catch (error) {
      this.logger.error(`Error changing password for user ${username}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get user information from Cognito
   */
  async getUserInfo(username: string): Promise<any> {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: username,
      });

      const result = await this.cognitoClient.send(command);
      return result;
    } catch (error) {
      this.logger.error(`Error getting user info for ${username}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update user attributes
   */
  async updateUserAttributes(
    username: string,
    attributes: Array<{ Name: string; Value: string }>
  ): Promise<void> {
    try {
      const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: this.userPoolId,
        Username: username,
        UserAttributes: attributes,
      });

      await this.cognitoClient.send(command);
      this.logger.log(`User attributes updated for: ${username}`);
    } catch (error) {
      this.logger.error(`Error updating user attributes for ${username}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a user from Cognito
   */
  async deleteUser(username: string): Promise<void> {
    try {
      const command = new AdminDeleteUserCommand({
        UserPoolId: this.userPoolId,
        Username: username,
      });

      await this.cognitoClient.send(command);
      this.logger.log(`User deleted from Cognito: ${username}`);
    } catch (error) {
      this.logger.error(`Error deleting user ${username}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate a secure temporary password
   */
  private generateTemporaryPassword(): string {
    const length = 12;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one character from each required type
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

}
