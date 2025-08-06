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
    elixirStreamName: process.env.ELIXIR_STREAM_NAME || 'elixir-notifications',
  },
  
  // Citrus Sharding Configuration
  citrus: {
    serverUrl: process.env.CITRUS_SERVER_URL || 'http://localhost:8080',
    apiKey: process.env.CITRUS_API_KEY || '',
    timeout: parseInt(process.env.CITRUS_TIMEOUT || '5000', 10),
    retryAttempts: parseInt(process.env.CITRUS_RETRY_ATTEMPTS || '3', 10),
  },
  
  // Elixir Service Configuration
  elixir: {
    url: process.env.ELIXIR_URL || 'http://elixir:4000',
  },
  
  // Validation Configuration
  validation: {
    enabled: process.env.VALIDATION_ENABLED === 'true' || true,
  },
}); 