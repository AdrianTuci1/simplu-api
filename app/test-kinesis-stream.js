require('dotenv').config();

const { KinesisClient, PutRecordCommand, GetRecordsCommand, GetShardIteratorCommand, ListShardsCommand } = require('@aws-sdk/client-kinesis');

// Verifică credențialele
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION || 'us-east-1';

console.log('🔐 AWS Configuration:');
console.log(`  Region: ${region}`);
console.log(`  Access Key ID: ${accessKeyId ? 'Set' : 'Not set'}`);
console.log(`  Secret Access Key: ${secretAccessKey ? 'Set' : 'Not set'}`);

if (!accessKeyId || !secretAccessKey) {
  console.error('\n❌ Missing AWS credentials!');
  console.error('Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
  process.exit(1);
}

// Configurație AWS
const clientConfig = {
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
};

const kinesisClient = new KinesisClient(clientConfig);

const streamName = process.env.KINESIS_STREAM_NAME || 'resources-stream';

async function testKinesisStream() {
  try {
    console.log('Testing Kinesis stream:', streamName);
    
    // 1. Testează dacă poți trimite un mesaj
    console.log('\n1. Testing message sending...');
    const testMessage = {
      operation: 'create',
      businessId: 'test-business',
      locationId: 'test-location',
      resourceType: 'test-resource',
      data: { test: 'data' },
      timestamp: new Date().toISOString(),
      requestId: 'test-request-' + Date.now(),
    };

    const putCommand = new PutRecordCommand({
      StreamName: streamName,
      Data: Buffer.from(JSON.stringify(testMessage)),
      PartitionKey: 'test-partition-key',
    });

    const putResult = await kinesisClient.send(putCommand);
    console.log('✅ Message sent successfully!');
    console.log('   Sequence Number:', putResult.SequenceNumber);
    console.log('   Shard ID:', putResult.ShardId);

    // 2. Testează dacă poți citi mesajele
    console.log('\n2. Testing message reading...');
    
    // Obține shard-urile
    const listShardsCommand = new ListShardsCommand({ StreamName: streamName });
    const shardsResponse = await kinesisClient.send(listShardsCommand);
    
    if (!shardsResponse.Shards || shardsResponse.Shards.length === 0) {
      console.log('❌ No shards found in stream');
      return;
    }

    console.log(`Found ${shardsResponse.Shards.length} shards`);

    // Pentru fiecare shard, încearcă să citești mesajele
    for (const shard of shardsResponse.Shards) {
      console.log(`\nReading from shard: ${shard.ShardId}`);
      
      const getIteratorCommand = new GetShardIteratorCommand({
        StreamName: streamName,
        ShardId: shard.ShardId,
        ShardIteratorType: 'TRIM_HORIZON', // Citește de la început
      });

      const iteratorResponse = await kinesisClient.send(getIteratorCommand);
      
      if (!iteratorResponse.ShardIterator) {
        console.log('❌ No shard iterator received');
        continue;
      }

      const getRecordsCommand = new GetRecordsCommand({
        ShardIterator: iteratorResponse.ShardIterator,
        Limit: 10,
      });

      const recordsResponse = await kinesisClient.send(getRecordsCommand);
      
      if (recordsResponse.Records && recordsResponse.Records.length > 0) {
        console.log(`✅ Found ${recordsResponse.Records.length} records in shard ${shard.ShardId}`);
        
        for (const record of recordsResponse.Records) {
          const data = JSON.parse(Buffer.from(record.Data).toString('utf-8'));
          console.log('   Record:', {
            sequenceNumber: record.SequenceNumber,
            operation: data.operation,
            resourceType: data.resourceType,
            businessId: data.businessId,
            timestamp: data.timestamp,
          });
        }
      } else {
        console.log('ℹ️  No records found in this shard');
      }
    }

  } catch (error) {
    console.error('❌ Error testing Kinesis stream:', error.message);
    
    if (error.name === 'ResourceNotFoundException') {
      console.log('💡 Stream does not exist. Make sure the stream is created in AWS Kinesis.');
      console.log(`   aws kinesis create-stream --stream-name ${streamName} --shard-count 1`);
    } else if (error.name === 'UnrecognizedClientException') {
      console.log('💡 AWS credentials issue. Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
    } else if (error.name === 'InvalidArgumentException') {
      console.log('💡 Invalid stream name or configuration.');
    } else if (error.name === 'InvalidClientTokenId') {
      console.log('💡 The access key ID is invalid or doesn\'t exist.');
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.log('💡 The secret access key is incorrect.');
    } else if (error.name === 'ExpiredTokenException') {
      console.log('💡 The credentials have expired.');
    } else if (error.name === 'AccessDenied') {
      console.log('💡 The credentials don\'t have permission to access Kinesis.');
    } else {
      console.log('💡 Unknown error. Check your AWS configuration and permissions.');
    }
  }
}

// Rulează testul
testKinesisStream();
