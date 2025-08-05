#!/usr/bin/env node

/**
 * Simple test script to verify Kinesis integration
 * Run with: node test-kinesis.js
 */

const { KinesisClient, PutRecordCommand } = require('@aws-sdk/client-kinesis');

async function testKinesisIntegration() {
  console.log('🧪 Testing Kinesis Integration...\n');

  // Configuration
  const config = {
    region: process.env.AWS_REGION || 'us-east-1',
    streamName: process.env.KINESIS_STREAM_NAME || 'resources-operations',
  };

  // Create Kinesis client
  const kinesisClient = new KinesisClient({
    region: config.region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  // Test data
  const testOperation = {
    operation: 'create',
    businessId: 'test-business-123',
    locationId: 'test-location-456',
    resourceType: 'appointment',
    resourceId: 'appointment-' + Date.now(),
    data: {
      patientName: 'John Doe',
      appointmentTime: new Date().toISOString(),
      service: 'consultation',
    },
    timestamp: new Date().toISOString(),
    requestId: 'test-request-' + Date.now(),
  };

  try {
    console.log('📤 Sending test operation to Kinesis...');
    console.log('Stream:', config.streamName);
    console.log('Region:', config.region);
    console.log('Operation:', JSON.stringify(testOperation, null, 2));

    const command = new PutRecordCommand({
      StreamName: config.streamName,
      Data: Buffer.from(JSON.stringify(testOperation)),
      PartitionKey: `${testOperation.businessId}-${testOperation.locationId}-${testOperation.resourceType}`,
    });

    const result = await kinesisClient.send(command);

    console.log('\n✅ Success! Operation sent to Kinesis');
    console.log('Shard ID:', result.ShardId);
    console.log('Sequence Number:', result.SequenceNumber);
    console.log('\n🎉 Kinesis integration is working correctly!');

  } catch (error) {
    console.error('\n❌ Error sending to Kinesis:');
    console.error('Error:', error.message);
    
    if (error.name === 'ResourceNotFoundException') {
      console.error('\n💡 Tip: Make sure the Kinesis stream exists:');
      console.error(`   aws kinesis create-stream --stream-name ${config.streamName} --shard-count 1`);
    } else if (error.name === 'UnrecognizedClientException') {
      console.error('\n💡 Tip: Check your AWS credentials:');
      console.error('   - AWS_ACCESS_KEY_ID');
      console.error('   - AWS_SECRET_ACCESS_KEY');
      console.error('   - AWS_REGION');
    }
    
    process.exit(1);
  }
}

// Check if required environment variables are set
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - AWS_ACCESS_KEY_ID');
  console.error('   - AWS_SECRET_ACCESS_KEY');
  console.error('\nPlease set these variables and try again.');
  process.exit(1);
}

testKinesisIntegration().catch(console.error);