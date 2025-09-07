const { DynamoDBDocumentClient, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
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
  ragSystemInstructions: process.env.DYNAMODB_RAG_SYSTEM_INSTRUCTIONS_TABLE || 'rag-system-instructions',
};

// Teste pentru verificarea instrucțiunilor din baza de date
async function testSystemInstructions() {
  console.log('🧪 Testing System Instructions from Database');
  console.log('==========================================');
  console.log(`📊 Using table: ${tableNames.ragSystemInstructions}`);
  
  const testCases = [
    // Teste pentru operatori
    { businessType: 'dental', role: 'operator', expectedKey: 'dental.operator.complete_guidance.v1' },
    { businessType: 'gym', role: 'operator', expectedKey: 'gym.operator.complete_guidance.v1' },
    { businessType: 'hotel', role: 'operator', expectedKey: 'hotel.operator.complete_guidance.v1' },
    { businessType: 'general', role: 'operator', expectedKey: 'general.operator.base_guidance.v1' },
    
    // Teste pentru clienți
    { businessType: 'dental', role: 'client', expectedKey: 'dental.client.limited_access.v1' },
    { businessType: 'gym', role: 'client', expectedKey: 'gym.client.limited_access.v1' },
    { businessType: 'hotel', role: 'client', expectedKey: 'hotel.client.limited_access.v1' },
    { businessType: 'general', role: 'client', expectedKey: 'general.client.base_guidance.v1' }
  ];
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const testCase of testCases) {
    try {
      console.log(`\n🔍 Testing: ${testCase.businessType} - ${testCase.role}`);
      
      // Test 1: Get specific instruction by key
      const specificInstruction = await getInstructionByKey(testCase.expectedKey);
      
      if (specificInstruction) {
        console.log(`✅ Found specific instruction: ${testCase.expectedKey}`);
        console.log(`   📝 Role: ${specificInstruction.instructionsJson?.role}`);
        console.log(`   🎯 Capabilities: ${JSON.stringify(specificInstruction.instructionsJson?.capabilities)}`);
        console.log(`   📊 Active: ${specificInstruction.isActive}`);
        successCount++;
      } else {
        console.log(`❌ Specific instruction not found: ${testCase.expectedKey}`);
        errorCount++;
      }
      
      // Test 2: List all instructions for business type
      const allInstructions = await listInstructionsByBusinessType(testCase.businessType);
      console.log(`📋 Found ${allInstructions.length} instructions for ${testCase.businessType}`);
      
      // Test 3: Filter active instructions
      const activeInstructions = allInstructions.filter(inst => inst.isActive);
      console.log(`✅ Active instructions: ${activeInstructions.length}`);
      
      // Test 4: Check role-specific instructions
      const roleInstructions = activeInstructions.filter(inst => 
        inst.instructionsJson?.role === testCase.role
      );
      console.log(`🎭 Role-specific instructions: ${roleInstructions.length}`);
      
    } catch (error) {
      console.error(`❌ Error testing ${testCase.businessType} - ${testCase.role}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n📊 Test Summary:');
  console.log(`✅ Successful tests: ${successCount}`);
  console.log(`❌ Failed tests: ${errorCount}`);
  console.log(`📋 Total test cases: ${testCases.length}`);
  
  if (errorCount === 0) {
    console.log('\n🎉 All system instruction tests passed!');
  } else {
    console.log(`\n⚠️  ${errorCount} tests failed. Check the errors above.`);
  }
}

// Funcție pentru a obține o instrucțiune specifică
async function getInstructionByKey(key) {
  try {
    const result = await dynamoClient.send(new GetCommand({
      TableName: tableNames.ragSystemInstructions,
      Key: { key }
    }));
    return result.Item || null;
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      console.log('📋 Table not found - run populate script first');
      return null;
    }
    throw error;
  }
}

// Funcție pentru a lista instrucțiunile după tipul de business
async function listInstructionsByBusinessType(businessType) {
  try {
    const result = await dynamoClient.send(new QueryCommand({
      TableName: tableNames.ragSystemInstructions,
      KeyConditionExpression: 'businessType = :businessType',
      ExpressionAttributeValues: {
        ':businessType': businessType,
      },
      Limit: 50
    }));
    return result.Items || [];
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      console.log('📋 Table not found - run populate script first');
      return [];
    }
    throw error;
  }
}

// Test pentru verificarea structurii instrucțiunilor
async function testInstructionStructure() {
  console.log('\n🔧 Testing Instruction Structure');
  console.log('================================');
  
  const testKey = 'dental.operator.complete_guidance.v1';
  const instruction = await getInstructionByKey(testKey);
  
  if (!instruction) {
    console.log('❌ No instruction found for structure test');
    return;
  }
  
  console.log('📋 Instruction structure:');
  console.log(`   Key: ${instruction.key}`);
  console.log(`   Business Type: ${instruction.businessType}`);
  console.log(`   Category: ${instruction.category}`);
  console.log(`   Version: ${instruction.version}`);
  console.log(`   Active: ${instruction.isActive}`);
  console.log(`   Created: ${instruction.createdAt}`);
  console.log(`   Updated: ${instruction.updatedAt}`);
  
  console.log('\n📝 Instructions JSON:');
  console.log(`   Role: ${instruction.instructionsJson?.role}`);
  console.log(`   Capabilities: ${JSON.stringify(instruction.instructionsJson?.capabilities, null, 2)}`);
  console.log(`   Primary Instruction: ${instruction.instructionsJson?.instructions?.primary}`);
  console.log(`   Data Access: ${instruction.instructionsJson?.instructions?.data_access}`);
  console.log(`   Response Style: ${instruction.instructionsJson?.instructions?.response_style}`);
  
  // Verificare câmpuri obligatorii
  const requiredFields = ['key', 'businessType', 'category', 'instructionsJson', 'isActive', 'createdAt', 'updatedAt'];
  const missingFields = requiredFields.filter(field => !instruction[field]);
  
  if (missingFields.length === 0) {
    console.log('✅ All required fields present');
  } else {
    console.log(`❌ Missing fields: ${missingFields.join(', ')}`);
  }
}

// Test pentru verificarea capabilităților
async function testCapabilities() {
  console.log('\n🎯 Testing Capabilities');
  console.log('======================');
  
  const testCases = [
    { key: 'dental.operator.complete_guidance.v1', expectedRole: 'operator' },
    { key: 'dental.client.limited_access.v1', expectedRole: 'client' }
  ];
  
  for (const testCase of testCases) {
    const instruction = await getInstructionByKey(testCase.key);
    
    if (!instruction) {
      console.log(`❌ Instruction not found: ${testCase.key}`);
      continue;
    }
    
    const capabilities = instruction.instructionsJson?.capabilities;
    const role = instruction.instructionsJson?.role;
    
    console.log(`\n🔍 Testing: ${testCase.key}`);
    console.log(`   Role: ${role} (expected: ${testCase.expectedRole})`);
    
    if (role === testCase.expectedRole) {
      console.log('✅ Role matches expected value');
    } else {
      console.log('❌ Role does not match expected value');
    }
    
    if (capabilities) {
      console.log('   Capabilities:');
      console.log(`     canAccessAllData: ${capabilities.canAccessAllData}`);
      console.log(`     canViewPersonalInfo: ${capabilities.canViewPersonalInfo}`);
      console.log(`     canModifyReservations: ${capabilities.canModifyReservations}`);
      console.log(`     canListAllResources: ${capabilities.canListAllResources}`);
      console.log(`     responseStyle: ${capabilities.responseStyle}`);
      
      // Verificare logică capabilități
      if (role === 'operator') {
        if (capabilities.canAccessAllData && capabilities.canViewPersonalInfo && capabilities.canModifyReservations) {
          console.log('✅ Operator capabilities are correct');
        } else {
          console.log('❌ Operator capabilities are incorrect');
        }
      } else if (role === 'client') {
        if (!capabilities.canAccessAllData && !capabilities.canViewPersonalInfo && !capabilities.canModifyReservations) {
          console.log('✅ Client capabilities are correct');
        } else {
          console.log('❌ Client capabilities are incorrect');
        }
      }
    } else {
      console.log('❌ No capabilities found');
    }
  }
}

// Rulare teste
async function main() {
  console.log('🚀 System Instructions Database Test Suite');
  console.log('==========================================');
  
  try {
    await testSystemInstructions();
    await testInstructionStructure();
    await testCapabilities();
    
    console.log('\n✨ All tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  }
}

// Rulare script
main();
