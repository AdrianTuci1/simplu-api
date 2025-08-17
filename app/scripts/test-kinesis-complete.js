#!/usr/bin/env node

/**
 * Comprehensive test script for AWS credentials and Kinesis integration
 * Run with: node scripts/test-kinesis-complete.js
 */

const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const { KinesisClient, PutRecordCommand, ListShardsCommand } = require('@aws-sdk/client-kinesis');

async function testAWSCredentials() {
  console.log('🔐 Step 1: Testing AWS Credentials...\n');

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';

  console.log('Environment Variables:');
  console.log(`  AWS_REGION: ${region}`);
  console.log(`  AWS_ACCESS_KEY_ID: ${accessKeyId ? 'Set' : 'Not set'}`);
  console.log(`  AWS_SECRET_ACCESS_KEY: ${secretAccessKey ? 'Set' : 'Not set'}`);

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Missing required AWS credentials!');
  }

  const stsClient = new STSClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  const command = new GetCallerIdentityCommand({});
  const response = await stsClient.send(command);

  console.log('✅ AWS credentials are valid!');
  console.log('Account ID:', response.Account);
  console.log('User ID:', response.UserId);
  console.log('ARN:', response.Arn);
  
  return { accessKeyId, secretAccessKey, region };
}

async function testKinesisStream(credentials) {
  console.log('\n📡 Step 2: Testing Kinesis Stream...\n');

  const { accessKeyId, secretAccessKey, region } = credentials;
  const streamName = process.env.KINESIS_STREAM_NAME || 'resources-operations';

  console.log('Kinesis Configuration:');
  console.log(`  Stream Name: ${streamName}`);
  console.log(`  Region: ${region}`);

  const kinesisClient = new KinesisClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  // Test 1: Check if stream exists
  console.log('\n1. Checking if stream exists...');
  try {
    const listShardsCommand = new ListShardsCommand({ StreamName: streamName });
    const shardsResponse = await kinesisClient.send(listShardsCommand);
    console.log(`✅ Stream exists with ${shardsResponse.Shards?.length || 0} shards`);
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      console.log('❌ Stream does not exist');
      console.log('💡 Create the stream with:');
      console.log(`   aws kinesis create-stream --stream-name ${streamName} --shard-count 1`);
      throw error;
    }
    throw error;
  }

  // Test 2: Send a test message
  console.log('\n2. Sending test message...');
  const testMessage = {
    operation: 'create',
    businessId: 'test-business-' + Date.now(),
    locationId: 'test-location-' + Date.now(),
    resourceType: 'test-resource',
    data: { test: 'data', timestamp: new Date().toISOString() },
    timestamp: new Date().toISOString(),
    requestId: 'test-request-' + Date.now(),
  };

  const putCommand = new PutRecordCommand({
    StreamName: streamName,
    Data: Buffer.from(JSON.stringify(testMessage)),
    PartitionKey: `${testMessage.businessId}-${testMessage.locationId}-${testMessage.resourceType}`,
  });

  const putResult = await kinesisClient.send(putCommand);
  console.log('✅ Message sent successfully!');
  console.log('   Sequence Number:', putResult.SequenceNumber);
  console.log('   Shard ID:', putResult.ShardId);
  console.log('   Message:', JSON.stringify(testMessage, null, 2));
}

async function runCompleteTest() {
  try {
    console.log('🧪 Starting comprehensive AWS/Kinesis test...\n');
    
    const credentials = await testAWSCredentials();
    await testKinesisStream(credentials);
    
    console.log('\n🎉 All tests passed! Kinesis integration is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.name === 'InvalidClientTokenId') {
      console.error('\n💡 The access key ID is invalid or doesn\'t exist.');
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.error('\n💡 The secret access key is incorrect.');
    } else if (error.name === 'ExpiredTokenException') {
      console.error('\n💡 The credentials have expired.');
    } else if (error.name === 'AccessDenied') {
      console.error('\n💡 The credentials don\'t have sufficient permissions.');
    } else if (error.name === 'ResourceNotFoundException') {
      console.error('\n💡 The Kinesis stream does not exist.');
    }
    
    process.exit(1);
  }
}

runCompleteTest().catch(console.error);
