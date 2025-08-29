export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),

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

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  kinesis: {
    streamName: process.env.KINESIS_STREAM_NAME || 'resources-operations',
    shardCount: parseInt(process.env.KINESIS_SHARD_COUNT || '1', 10),
  },

  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  // Lambda Authorizer Configuration
  lambdaAuthorizer: {
    enabled: process.env.LAMBDA_AUTHORIZER_ENABLED !== 'false', // Default: true
    bypassForDevelopment: process.env.LAMBDA_AUTHORIZER_BYPASS === 'true', // Default: false
    mockUser:
      process.env.LAMBDA_AUTHORIZER_MOCK_USER === 'true'
        ? {
            userId:
              process.env.LAMBDA_AUTHORIZER_MOCK_USER_ID || 'mock-user-123',
            userName:
              process.env.LAMBDA_AUTHORIZER_MOCK_USER_NAME ||
              'mock.user@example.com',
            businessId:
              process.env.LAMBDA_AUTHORIZER_MOCK_BUSINESS_ID ||
              'mock-business-456',
            roles: JSON.parse(
              process.env.LAMBDA_AUTHORIZER_MOCK_ROLES ||
                JSON.stringify([
                  {
                    locationId: 'mock-location-789',
                    locationName: 'Mock Location',
                    role: 'admin',
                    permissions: ['read', 'write', 'delete'],
                  },
                ]),
            ),
          }
        : null,
  },
});
