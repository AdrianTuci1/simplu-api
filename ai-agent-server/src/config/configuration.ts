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
  
  // Gemini Configuration
  gemini: {
    apiKey: process.env.GOOGLE_API_KEY,
    modelName: process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash-exp',
    maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '8192'),
    temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.1'),
    topP: parseFloat(process.env.GEMINI_TOP_P || '0.8'),
    topK: parseInt(process.env.GEMINI_TOP_K || '40'),
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
}); 