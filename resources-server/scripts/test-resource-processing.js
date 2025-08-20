const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const kinesis = new AWS.Kinesis();

async function testResourceProcessing() {
  const streamName = process.env.KINESIS_STREAM_NAME || 'resources-stream';
  
  // Test messages with different operations
  const testMessages = [
    {
      operation: 'create',
      resourceType: 'appointments',
      businessId: 'b1',
      locationId: 'loc1',
      data: {
        clientName: 'Test Client 1',
        appointmentDate: '2024-01-15',
        startTime: '10:00',
        endTime: '11:00'
      },
      timestamp: new Date().toISOString(),
      requestId: 'test-create-123'
    },
    {
      operation: 'update',
      resourceType: 'appointments',
      businessId: 'b1',
      locationId: 'loc1',
      resourceId: 'ap24-00001',
      data: {
        clientName: 'Updated Client',
        appointmentDate: '2024-01-16',
        startTime: '14:00',
        endTime: '15:00'
      },
      timestamp: new Date().toISOString(),
      requestId: 'test-update-123'
    },
    {
      operation: 'patch',
      resourceType: 'appointments',
      businessId: 'b1',
      locationId: 'loc1',
      resourceId: 'ap24-00001',
      data: {
        notes: 'Updated notes for appointment'
      },
      timestamp: new Date().toISOString(),
      requestId: 'test-patch-123'
    },
    {
      operation: 'delete',
      resourceType: 'appointments',
      businessId: 'b1',
      locationId: 'loc1',
      resourceId: 'ap24-00001',
      timestamp: new Date().toISOString(),
      requestId: 'test-delete-123'
    }
  ];

  console.log('🧪 Testing Resource Processing...\n');

  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    
    try {
      console.log(`📤 Sending ${message.operation} operation...`);
      console.log(`   Business: ${message.businessId}, Location: ${message.locationId}`);
      console.log(`   Resource Type: ${message.resourceType}`);
      if (message.resourceId) {
        console.log(`   Resource ID: ${message.resourceId}`);
      }
      
      const params = {
        StreamName: streamName,
        Data: JSON.stringify(message),
        PartitionKey: `${message.businessId}-${message.locationId}-${message.resourceType}`
      };

      const result = await kinesis.putRecord(params).promise();
      console.log(`   ✅ ${message.operation} operation sent successfully!`);
      console.log(`   Sequence Number: ${result.SequenceNumber}`);
      console.log(`   Shard ID: ${result.ShardId}\n`);
      
      // Wait a bit between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`   ❌ Error sending ${message.operation} operation:`, error.message);
      console.log('');
    }
  }

  console.log('🎉 Test completed! Check the resources-server logs to see if messages were processed correctly.');
}

// Run the test
testResourceProcessing().catch(console.error);
