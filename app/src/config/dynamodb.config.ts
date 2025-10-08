import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export interface DynamoDBConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string; // For local development
  businessInfoTableName: string;
  externalApiConfigTableName: string;
}

export const dynamoDBConfig = (): DynamoDBConfig => ({
  region: process.env.AWS_DYNAMODB_REGION || 'eu-central-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: process.env.DYNAMODB_ENDPOINT, // For local DynamoDB
  businessInfoTableName:
    process.env.DYNAMODB_BUSINESS_INFO_TABLE || 'business-info',
  externalApiConfigTableName:
    process.env.DYNAMODB_EXTERNAL_API_CONFIG_TABLE || 'business-external-api-config',
});

export class DynamoDBService {
  private client: DynamoDBDocumentClient;
  private config: DynamoDBConfig;

  constructor() {
    this.config = dynamoDBConfig();

    const dynamoClient = new DynamoDBClient({
      region: this.config.region,
      ...(this.config.accessKeyId &&
        this.config.secretAccessKey && {
          credentials: {
            accessKeyId: this.config.accessKeyId,
            secretAccessKey: this.config.secretAccessKey,
          },
        }),
      ...(this.config.endpoint && { endpoint: this.config.endpoint }),
    });

    this.client = DynamoDBDocumentClient.from(dynamoClient);
  }

  getClient(): DynamoDBDocumentClient {
    return this.client;
  }

  getTableName(): string {
    return this.config.businessInfoTableName;
  }

  getExternalApiConfigTableName(): string {
    return this.config.externalApiConfigTableName;
  }
}

export const dynamoDBService = new DynamoDBService();
