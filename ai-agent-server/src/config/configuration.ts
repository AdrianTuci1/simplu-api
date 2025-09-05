import { cronConfig } from './cron.config';

export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // AWS Configuration
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  
  // DynamoDB Tables
  dynamodb: {
    sessionsTable: process.env.DYNAMODB_SESSIONS_TABLE || 'ai-agent-sessions',
    messagesTable: process.env.DYNAMODB_MESSAGES_TABLE || 'ai-agent-messages',
    businessInfoTable: process.env.DYNAMODB_BUSINESS_INFO_TABLE || 'business-info',
    ragTable: process.env.DYNAMODB_RAG_TABLE || 'rag-instructions',
    externalCredentialsTable: process.env.DYNAMODB_EXTERNAL_CREDENTIALS_TABLE || 'business-external-credentials',
  },

  // Database Configuration - supports both Citrus and RDS
  database: {
    type: process.env.DATABASE_TYPE || 'citrus', // 'citrus' or 'rds'

    // RDS Configuration
    rds: {
      host: process.env.RDS_HOST || 'localhost',
      port: parseInt(process.env.RDS_PORT || '5432', 10),
      username: process.env.RDS_USERNAME || 'postgres',
      password: process.env.RDS_PASSWORD || 'postgres',
      database: process.env.RDS_DATABASE || 'simplu',
      ssl: process.env.RDS_SSL === 'true',
      synchronize: process.env.RDS_SYNCHRONIZE === 'true' || false,
      logging: process.env.RDS_LOGGING === 'true' || false,
    },

    // Citrus Sharding Configuration
    citrus: {
      serverUrl: process.env.CITRUS_SERVER_URL || 'http://localhost:8080',
      apiKey: process.env.CITRUS_API_KEY || '',
      timeout: parseInt(process.env.CITRUS_TIMEOUT || '5000', 10),
      retryAttempts: parseInt(process.env.CITRUS_RETRY_ATTEMPTS || '3', 10),
    },
  },

  
  // API Server
  apiServer: {
    url: process.env.API_SERVER_URL,
    key: process.env.API_SERVER_KEY,
  },
  
  // External APIs
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
  },
  
  meta: {
    accessToken: process.env.META_ACCESS_TOKEN,
    phoneNumberId: process.env.META_PHONE_NUMBER_ID,
    webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN,
    appSecret: process.env.META_APP_SECRET,
  },
  
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    modelName: process.env.OPENAI_MODEL_NAME || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '8192'),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.1'),
    topP: parseFloat(process.env.OPENAI_TOP_P || '0.8'),
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  
  // Webhooks Configuration
  webhooks: {
    meta: {
      verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || 'default_verify_token',
      signatureHeader: 'x-hub-signature-256',
      signatureAlgorithm: 'sha256',
      challengeTimeout: 5000,
    },
    twilio: {
      validateRequest: true,
      timeout: 10000,
    },
    general: {
      maxPayloadSize: '10mb',
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100,
      },
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
    },
    security: {
      validateSignature: true,
      requireBusinessId: true,
      allowedSources: ['meta', 'twilio'],
      blockUnknownSources: true,
    },
    processing: {
      enableAutonomousActions: true,
      enableAutoResponse: true,
      maxProcessingTime: 25000,
      enableFallback: true,
    },
  },
  
  // Cron Jobs Configuration
  cron: cronConfig,
}); 