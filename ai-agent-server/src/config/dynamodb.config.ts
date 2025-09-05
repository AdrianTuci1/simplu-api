import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export const dynamoDBConfig = {
  region: process.env.AWS_DYNAMODB_REGION || process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  ...(process.env.DYNAMODB_ENDPOINT && { endpoint: process.env.DYNAMODB_ENDPOINT }),
};

export const dynamoDBClient = new DynamoDBClient(dynamoDBConfig);

export const tableNames = {
  sessions: process.env.DYNAMODB_SESSIONS_TABLE || 'ai-agent-sessions',
  messages: process.env.DYNAMODB_MESSAGES_TABLE || 'ai-agent-messages',
  businessInfo: process.env.DYNAMODB_BUSINESS_INFO_TABLE || 'business-info',

  // RAG instructions (business workflows)
  ragInstructions: process.env.DYNAMODB_RAG_INSTRUCTIONS_TABLE || 'rag-instructions',

  ragSystemInstructions: process.env.DYNAMODB_RAG_SYSTEM_TABLE || 'rag-system-instructions',
  // Dynamic RAG tables
  ragDynamicBusiness: process.env.DYNAMODB_RAG_DYNAMIC_BUSINESS_TABLE || 'rag-dynamic-business',
  ragDynamicUser: process.env.DYNAMODB_RAG_DYNAMIC_USER_TABLE || 'rag-dynamic-user',
  
  externalCredentials: process.env.DYNAMODB_EXTERNAL_CREDENTIALS_TABLE || 'business-external-credentials',
}; 