const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const kinesis = new AWS.Kinesis();

async function testSimpleMessage() {
  const streamName = process.env.KINESIS_STREAM_NAME || 'resources-stream';
  
  // Simple test message
  const testMessage = {
    operation: 'create',
    resourceType: 'appointments',
    businessId: 'b1',
    locationId: 'loc1',
    data: {
      clientName: 'Test Client',
      appointmentDate: '2024-01-15'
    },
    timestamp: new Date().toISOString(),
    requestId: 'test-123'
  };

  try {
    console.log('📤 Sending test message...');
    console.log('Message:', JSON.stringify(testMessage, null, 2));
    
    const params = {
      StreamName: streamName,
      Data: JSON.stringify(testMessage),
      PartitionKey: `${testMessage.businessId}-${testMessage.locationId}-${testMessage.resourceType}`
    };

    const result = await kinesis.putRecord(params).promise();
    console.log('✅ Message sent successfully!');
    console.log('Sequence Number:', result.SequenceNumber);
    console.log('Shard ID:', result.ShardId);
    
  } catch (error) {
    console.error('❌ Error sending message:', error.message);
  }
}

// Run the test
testSimpleMessage();
