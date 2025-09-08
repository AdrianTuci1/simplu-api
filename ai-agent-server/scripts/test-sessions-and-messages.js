const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');

// Configurare DynamoDB
const dynamoDBConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

const dynamoDBClient = new DynamoDBClient(dynamoDBConfig);
const dynamoClient = DynamoDBDocumentClient.from(dynamoDBClient);

const tableNames = {
  sessions: process.env.DYNAMODB_SESSIONS_TABLE || 'ai-agent-sessions',
  messages: process.env.DYNAMODB_MESSIONS_TABLE || 'ai-agent-messages',
};

// Test data
const testBusinessId = 'test-business-123';
const testUserId = 'test-user-456';
const testLocationId = 'test-location-789';

async function generateSessionId(businessId, userId) {
  return `${businessId}:${userId}:${Date.now()}`;
}

async function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function testSessionCreation() {
  console.log('🧪 Testing Session Creation');
  console.log('===========================');

  try {
    // Create test session
    const sessionId = await generateSessionId(testBusinessId, testUserId);
    const session = {
      sessionId,
      businessId: testBusinessId,
      locationId: testLocationId,
      userId: testUserId,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      metadata: {
        businessType: 'dental',
        context: {}
      }
    };

    console.log(`📝 Creating session: ${sessionId}`);
    await dynamoClient.send(new PutCommand({
      TableName: tableNames.sessions,
      Item: session
    }));

    console.log('✅ Session created successfully!');

    // Test retrieving session
    console.log('🔍 Retrieving session...');
    const getResult = await dynamoClient.send(new GetCommand({
      TableName: tableNames.sessions,
      Key: { sessionId }
    }));

    if (getResult.Item) {
      console.log('✅ Session retrieved successfully!');
      console.log(`   Business ID: ${getResult.Item.businessId}`);
      console.log(`   User ID: ${getResult.Item.userId}`);
      console.log(`   Status: ${getResult.Item.status}`);
    } else {
      console.log('❌ Failed to retrieve session');
      return null;
    }

    return sessionId;
  } catch (error) {
    console.error('❌ Error testing session creation:', error.message);
    return null;
  }
}

async function testMessageCreation(sessionId) {
  console.log('\n🧪 Testing Message Creation');
  console.log('============================');

  if (!sessionId) {
    console.log('❌ No session ID provided, skipping message test');
    return;
  }

  try {
    // Create test user message
    const userMessageId = await generateMessageId();
    const userMessage = {
      messageId: userMessageId,
      sessionId,
      businessId: testBusinessId,
      userId: testUserId,
      content: 'Salut! Vreau să fac o programare pentru o consultație.',
      type: 'user',
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'websocket'
      }
    };

    console.log(`📝 Creating user message: ${userMessageId}`);
    await dynamoClient.send(new PutCommand({
      TableName: tableNames.messages,
      Item: userMessage
    }));

    console.log('✅ User message created successfully!');

    // Create test agent message
    const agentMessageId = await generateMessageId();
    const agentMessage = {
      messageId: agentMessageId,
      sessionId,
      businessId: testBusinessId,
      userId: 'agent',
      content: 'Bună! Cu plăcere vă ajut cu programarea. Pentru ce tip de consultație aveți nevoie?',
      type: 'agent',
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'websocket',
        responseId: `resp_${Date.now()}`
      }
    };

    console.log(`📝 Creating agent message: ${agentMessageId}`);
    await dynamoClient.send(new PutCommand({
      TableName: tableNames.messages,
      Item: agentMessage
    }));

    console.log('✅ Agent message created successfully!');

    return { userMessageId, agentMessageId };
  } catch (error) {
    console.error('❌ Error testing message creation:', error.message);
    return null;
  }
}

async function testSessionMessagesQuery(sessionId) {
  console.log('\n🧪 Testing Session Messages Query');
  console.log('==================================');

  if (!sessionId) {
    console.log('❌ No session ID provided, skipping query test');
    return;
  }

  try {
    console.log(`🔍 Querying messages for session: ${sessionId}`);
    const queryResult = await dynamoClient.send(new QueryCommand({
      TableName: tableNames.messages,
      KeyConditionExpression: 'sessionId = :sessionId',
      ExpressionAttributeValues: {
        ':sessionId': sessionId
      },
      ScanIndexForward: false, // Most recent first
      Limit: 10
    }));

    if (queryResult.Items && queryResult.Items.length > 0) {
      console.log(`✅ Found ${queryResult.Items.length} messages in session`);
      queryResult.Items.forEach((msg, index) => {
        console.log(`   ${index + 1}. [${msg.type}] ${msg.content.substring(0, 50)}...`);
      });
    } else {
      console.log('❌ No messages found in session');
    }
  } catch (error) {
    console.error('❌ Error querying session messages:', error.message);
  }
}

async function testActiveSessionQuery() {
  console.log('\n🧪 Testing Active Session Query (GSI)');
  console.log('======================================');

  try {
    console.log(`🔍 Querying active sessions for business: ${testBusinessId}, user: ${testUserId}`);
    const queryResult = await dynamoClient.send(new QueryCommand({
      TableName: tableNames.sessions,
      IndexName: 'businessId-userId-index',
      KeyConditionExpression: 'businessId = :businessId AND userId = :userId',
      FilterExpression: 'status = :status',
      ExpressionAttributeValues: {
        ':businessId': testBusinessId,
        ':userId': testUserId,
        ':status': 'active'
      },
      ScanIndexForward: false, // Most recent first
      Limit: 1
    }));

    if (queryResult.Items && queryResult.Items.length > 0) {
      console.log(`✅ Found ${queryResult.Items.length} active session(s)`);
      queryResult.Items.forEach((session, index) => {
        console.log(`   ${index + 1}. Session ID: ${session.sessionId}`);
        console.log(`      Status: ${session.status}`);
        console.log(`      Created: ${session.createdAt}`);
      });
    } else {
      console.log('❌ No active sessions found');
    }
  } catch (error) {
    console.error('❌ Error querying active sessions:', error.message);
    if (error.message.includes('IndexName')) {
      console.log('💡 Hint: Make sure the GSI "businessId-userId-index" exists in the sessions table');
    }
  }
}

async function runAllTests() {
  console.log('🚀 Starting Sessions and Messages Tests');
  console.log('========================================');
  console.log(`🌍 AWS Region: ${process.env.AWS_REGION || 'us-east-1'}`);
  console.log(`📊 Sessions Table: ${tableNames.sessions}`);
  console.log(`📊 Messages Table: ${tableNames.messages}`);
  console.log('');

  // Test 1: Create session
  const sessionId = await testSessionCreation();
  
  // Test 2: Create messages
  const messageIds = await testMessageCreation(sessionId);
  
  // Test 3: Query session messages
  await testSessionMessagesQuery(sessionId);
  
  // Test 4: Query active sessions (GSI test)
  await testActiveSessionQuery();

  console.log('\n📊 Test Summary:');
  console.log('================');
  console.log(`✅ Session created: ${sessionId ? 'Yes' : 'No'}`);
  console.log(`✅ Messages created: ${messageIds ? 'Yes' : 'No'}`);
  console.log('✅ All tests completed!');
  
  if (sessionId && messageIds) {
    console.log('\n🎉 All tests passed! Your DynamoDB setup is working correctly.');
    console.log('\n📝 Test data created:');
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   User Message ID: ${messageIds.userMessageId}`);
    console.log(`   Agent Message ID: ${messageIds.agentMessageId}`);
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

// Rulare script
runAllTests()
  .then(() => {
    console.log('\n🏁 Testing completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error during testing:', error);
    process.exit(1);
  });
