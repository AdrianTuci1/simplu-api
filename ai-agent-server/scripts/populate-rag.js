const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const dotenv = require('dotenv');
const path = require('path');

// Load .env file from the project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Configurare DynamoDB
const dynamoDBConfig = {
  region: 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

const dynamoDBClient = new DynamoDBClient(dynamoDBConfig);
const dynamoClient = DynamoDBDocumentClient.from(dynamoDBClient);

const tableNames = {
  ragSystemInstructions: 'rag-system-instructions',
  ragDynamicBusiness: 'rag-dynamic-business',
  ragDynamicUser: 'rag-dynamic-user',
};

// Sample RAG data for testing - this will be populated from the database in production
const sampleRagData = {
  // Sample business memory
  businessMemory: [
    {
      memoryKey: 'biz123#dental#appointment_booking',
      businessId: 'biz123',
      businessType: 'dental',
      action: 'appointment_booking',
      preferences: {
        preferredTimeSlots: ['09:00', '10:00', '14:00', '15:00'],
        maxAppointmentsPerDay: 20,
        emergencySlots: 2
      },
      statistics: {
        totalAppointments: 150,
        averageBookingTime: '2.5 minutes',
        mostPopularService: 'consultation'
      },
      updatedAt: new Date().toISOString()
    }
  ],

  // Sample user memory
  userMemory: [
    {
      memoryKey: 'biz123#user456#meta',
      businessId: 'biz123',
      userId: 'user456',
      platform: 'meta',
      customerInfo: {
        name: 'Ion Popescu',
        phone: '+40123456789',
        email: 'ion.popescu@example.com',
        lastAppointment: '2024-01-10',
        totalAppointments: 5,
        preferences: {
          preferredDoctor: 'Dr. Maria Ionescu',
          preferredTime: 'morning'
        }
      },
      interactionHistory: [
        {
          timestamp: '2024-01-15T10:00:00Z',
          message: 'Vreau să fac o programare',
          response: 'Am înțeles, vă voi ajuta cu programarea',
          platform: 'meta'
        }
      ],
      lastInteraction: '2024-01-15T10:00:00Z',
      interactionCount: 1,
      updatedAt: new Date().toISOString()
    }
  ]
};

async function populateRagData() {
  console.log('🚀 Starting RAG Data Population...');
  console.log('==================================');
  
  let successCount = 0;
  let errorCount = 0;
  
  // Populate business memory
  console.log('\n📊 Populating Business Memory...');
  for (const businessMemory of sampleRagData.businessMemory) {
    try {
      await dynamoClient.send(new PutCommand({
        TableName: tableNames.ragDynamicBusiness,
        Item: businessMemory
      }));
      
      console.log(`✅ Added business memory: ${businessMemory.memoryKey}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error adding business memory ${businessMemory.memoryKey}:`, error.message);
      errorCount++;
    }
  }
  
  // Populate user memory
  console.log('\n👥 Populating User Memory...');
  for (const userMemory of sampleRagData.userMemory) {
    try {
      await dynamoClient.send(new PutCommand({
        TableName: tableNames.ragDynamicUser,
        Item: userMemory
      }));
      
      console.log(`✅ Added user memory: ${userMemory.memoryKey}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error adding user memory ${userMemory.memoryKey}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n📊 Population Summary:');
  console.log(`✅ Successfully added: ${successCount} RAG entries`);
  console.log(`❌ Failed to add: ${errorCount} RAG entries`);
  console.log(`📋 Total processed: ${sampleRagData.businessMemory.length + sampleRagData.userMemory.length} entries`);
  
  if (errorCount === 0) {
    console.log('\n🎉 All RAG data populated successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Test your AI agent with RAG memory');
    console.log('2. Verify customer recognition across platforms');
    console.log('3. Check business memory functionality');
  } else {
    console.log(`\n⚠️  ${errorCount} entries failed to populate. Check the errors above.`);
  }
}

// Rulare script
populateRagData()
  .then(() => {
    console.log('\n✨ RAG data population completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 RAG data population failed:', error);
    process.exit(1);
  }); 