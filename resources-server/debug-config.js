require('dotenv').config();

console.log('🔍 Debug Configuration Values:\n');

// Direct environment variables
console.log('Direct Environment Variables:');
console.log(`  AWS_REGION: ${process.env.AWS_REGION}`);
console.log(`  AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not set'}`);
console.log(`  AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Not set'}`);
console.log(`  KINESIS_STREAM_NAME: ${process.env.KINESIS_STREAM_NAME}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);

// Simulate the configuration function
const configuration = () => ({
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
  
  // Database Configuration
  database: {
    type: process.env.DATABASE_TYPE || 'citrus',
  },
});

const config = configuration();

console.log('\nConfiguration Object:');
console.log(`  aws.region: ${config.aws.region}`);
console.log(`  aws.accessKeyId: ${config.aws.accessKeyId ? 'Set' : 'Not set'}`);
console.log(`  aws.secretAccessKey: ${config.aws.secretAccessKey ? 'Set' : 'Not set'}`);
console.log(`  kinesis.streamName: ${config.kinesis.streamName}`);
console.log(`  database.type: ${config.database.type}`);

// Test Kinesis connection with these values
console.log('\n🧪 Testing Kinesis with configuration values...');

const { KinesisClient, ListShardsCommand } = require('@aws-sdk/client-kinesis');

async function testKinesisWithConfig() {
  const clientConfig = {
    region: config.aws.region,
  };

  if (config.aws.accessKeyId && config.aws.secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    };
  }

  console.log('Kinesis Client Config:', {
    region: clientConfig.region,
    hasCredentials: !!clientConfig.credentials,
  });

  const kinesisClient = new KinesisClient(clientConfig);

  try {
    const listShardsCommand = new ListShardsCommand({ StreamName: config.kinesis.streamName });
    const response = await kinesisClient.send(listShardsCommand);
    
    console.log(`✅ Success! Stream exists with ${response.Shards?.length || 0} shards`);
    console.log('Shard IDs:', response.Shards?.map(shard => shard.ShardId).join(', '));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error details:', {
      name: error.name,
      code: error.$metadata?.httpStatusCode,
      region: config.aws.region,
      streamName: config.kinesis.streamName,
    });
  }
}

testKinesisWithConfig().catch(console.error);
