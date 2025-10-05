export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  environment: process.env.NODE_ENV || 'development',
  
  // AWS Configuration
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  
  // Kinesis Configuration
  kinesis: {
    streamName: process.env.KINESIS_STREAM_NAME || 'resources-stream',
  },
  
  // Database Configuration - supports both Citrus and RDS
  database: {
    type: process.env.DATABASE_TYPE || 'citrus', // 'citrus' or 'rds'
    
    // RDS Configuration
    rds: {
      host: process.env.RDS_HOST || 'localhost',
      port: parseInt(process.env.RDS_PORT || '5432', 10),
      username: process.env.RDS_USERNAME || 'postgres',
      password: process.env.RDS_PASSWORD || '',
      database: process.env.RDS_DATABASE || 'resources_db',
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
  
  // Elixir Service Configuration
  elixir: {
    url: process.env.ELIXIR_URL || 'http://elixir:4000',
  },
  
  // Validation Configuration
  validation: {
    enabled: process.env.VALIDATION_ENABLED === 'true' || true,
  },
  
  // SQS Configuration
  sqs: {
    shardCreationQueueUrl: process.env.SQS_SHARD_CREATION_QUEUE_URL,
    awsSqsRegion: process.env.AWS_SQS_REGION || 'eu-central-1',
  },
}); 