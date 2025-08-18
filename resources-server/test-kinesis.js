const { KinesisClient, ListShardsCommand } = require('@aws-sdk/client-kinesis');
require('dotenv').config();

async function testKinesisStream() {
  console.log('🧪 Testing Kinesis Stream Connection...\n');

  const streamName = process.env.KINESIS_STREAM_NAME || 'resources-stream';
  const region = 'eu-north-1'; // Test in eu-north-1
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  console.log('Configuration:');
  console.log(`  Stream Name: ${streamName}`);
  console.log(`  Region: ${region}`);
  console.log(`  Access Key ID: ${accessKeyId ? 'Configured' : 'Not configured'}`);
  console.log(`  Secret Access Key: ${secretAccessKey ? 'Configured' : 'Not configured'}`);

  const clientConfig = {
    region,
  };

  if (accessKeyId && secretAccessKey) {
    clientConfig.credentials = { accessKeyId, secretAccessKey };
  }

  const kinesisClient = new KinesisClient(clientConfig);

  try {
    console.log('\n1. Testing stream access...');
    const listShardsCommand = new ListShardsCommand({ StreamName: streamName });
    const response = await kinesisClient.send(listShardsCommand);
    
    console.log(`✅ Stream exists with ${response.Shards?.length || 0} shards`);
    console.log('Shard IDs:', response.Shards?.map(shard => shard.ShardId).join(', '));
    
  } catch (error) {
    console.error('❌ Error accessing stream:', error.message);
    
    if (error.name === 'ResourceNotFoundException') {
      console.error('\n💡 The stream does not exist. Create it with:');
      console.error(`   aws kinesis create-stream --stream-name ${streamName} --shard-count 1`);
    } else if (error.name === 'AccessDenied') {
      console.error('\n💡 Access denied. Check AWS credentials and permissions.');
    } else if (error.name === 'InvalidClientTokenId') {
      console.error('\n💡 Invalid AWS credentials.');
    }
    
    throw error;
  }
}

testKinesisStream().catch(console.error);
