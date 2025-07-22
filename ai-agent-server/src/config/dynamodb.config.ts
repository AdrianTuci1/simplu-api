import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export const dynamoDBConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
};

export const dynamoDBClient = new DynamoDBClient(dynamoDBConfig);

export const tableNames = {
  sessions: process.env.DYNAMODB_SESSIONS_TABLE || 'ai-agent-sessions',
  messages: process.env.DYNAMODB_MESSAGES_TABLE || 'ai-agent-messages',
  businessInfo: process.env.DYNAMODB_BUSINESS_INFO_TABLE || 'business-info',
  ragInstructions: process.env.DYNAMODB_RAG_TABLE || 'rag-instructions',
  externalCredentials: process.env.DYNAMODB_EXTERNAL_CREDENTIALS_TABLE || 'business-external-credentials',
}; 