import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export const cognitoConfig = (): CognitoConfig => ({
  userPoolId: process.env.COGNITO_USER_POOL_ID || '',
  clientId: process.env.COGNITO_CLIENT_ID || '',
  region: process.env.COGNITOR_REGION || 'eu-central-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export class CognitoService {
  private client: CognitoIdentityProviderClient;
  private config: CognitoConfig;

  constructor() {
    this.config = cognitoConfig();

    this.client = new CognitoIdentityProviderClient({
      region: this.config.region,
      ...(this.config.accessKeyId &&
        this.config.secretAccessKey && {
          credentials: {
            accessKeyId: this.config.accessKeyId,
            secretAccessKey: this.config.secretAccessKey,
          },
        }),
    });
  }

  getClient(): CognitoIdentityProviderClient {
    return this.client;
  }

  getConfig(): CognitoConfig {
    return this.config;
  }
}

export const cognitoService = new CognitoService();
