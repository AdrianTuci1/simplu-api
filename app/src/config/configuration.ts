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
    streamName: process.env.KINESIS_STREAM_NAME || 'resources-stream',
    shardCount: parseInt(process.env.KINESIS_SHARD_COUNT || '1', 10),
    region: process.env.AWS_REGION || 'eu-north-1',
  },

  aws: {
    region: process.env.COGNITO_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },

});
