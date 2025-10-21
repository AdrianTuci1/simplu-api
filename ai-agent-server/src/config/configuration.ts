import { cronConfig } from './cron.config';
import { bedrockConfig } from './bedrock.config';

export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // AWS Configuration
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  
  // AWS Bedrock Configuration
  bedrock: bedrockConfig,
  
  // DynamoDB Tables
  dynamodb: {
    sessionsTable: process.env.DYNAMODB_SESSIONS_TABLE || 'ai-agent-sessions',
    messagesTable: process.env.DYNAMODB_MESSAGES_TABLE || 'ai-agent-messages',
    businessInfoTable: process.env.DYNAMODB_BUSINESS_INFO_TABLE || 'business-info',
    ragTable: process.env.DYNAMODB_RAG_TABLE || 'rag-instructions',
    externalCredentialsTable: process.env.DYNAMODB_EXTERNAL_CREDENTIALS_TABLE || 'business-external-credentials',
  },

  // Database Configuration - Citrus only
  database: {
    type: 'citrus', // Only Citrus is supported now

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
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    toolIds: {
      dental: (process.env.ELEVENLABS_TOOL_IDS_DENTAL || '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      gym: (process.env.ELEVENLABS_TOOL_IDS_GYM || '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      hotel: (process.env.ELEVENLABS_TOOL_IDS_HOTEL || '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    },
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
  },
  
  meta: {
    appId: process.env.META_APP_ID,
    appSecret: process.env.META_APP_SECRET,
    redirectUri: process.env.META_REDIRECT_URI || 'http://localhost:3003/external/meta/callback',
    // Scopes pentru WhatsApp + Instagram Messaging
    // IMPORTANT: instagram_basic și instagram_manage_messages necesită:
    // 1. Business Verification (dacă nu ai făcut-o deja)
    // 2. App Review de la Meta pentru producție
    // 3. Instagram Business Account conectat la o Facebook Page
    // Pentru development/testing poți folosi doar pages_messaging
    scopes: process.env.META_OAUTH_SCOPES || 'pages_show_list,pages_messaging,pages_manage_metadata',
    accessToken: process.env.META_ACCESS_TOKEN,
    phoneNumberId: process.env.META_PHONE_NUMBER_ID,
    webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN,
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