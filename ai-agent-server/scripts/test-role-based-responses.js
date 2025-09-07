const axios = require('axios');

// Configurare pentru testare
const BASE_URL = process.env.AI_AGENT_URL || 'http://localhost:3000';
const TEST_BUSINESS_ID = 'test-business-123';
const TEST_LOCATION_ID = 'test-location-456';

// Funcție pentru testare WebSocket (Operator)
async function testOperatorRequest(message) {
  try {
    console.log(`\n🔵 Testing OPERATOR request: "${message}"`);
    
    const response = await axios.post(`${BASE_URL}/agent/process-message`, {
      businessId: TEST_BUSINESS_ID,
      locationId: TEST_LOCATION_ID,
      userId: 'operator-123',
      message: message
    });
    
    console.log(`✅ Response: ${response.data.message}`);
    console.log(`📊 Response length: ${response.data.message.length} characters`);
    console.log(`🎯 Actions: ${JSON.stringify(response.data.actions)}`);
    
    return response.data;
  } catch (error) {
    console.error(`❌ Error testing operator request:`, error.response?.data || error.message);
    return null;
  }
}

// Funcție pentru testare Webhook (Client)
async function testClientRequest(message) {
  try {
    console.log(`\n🟢 Testing CLIENT request: "${message}"`);
    
    const response = await axios.post(`${BASE_URL}/agent/process-webhook-pipeline`, {
      businessId: TEST_BUSINESS_ID,
      locationId: TEST_LOCATION_ID,
      userId: 'client-123',
      message: message,
      source: 'meta'
    });
    
    console.log(`✅ Response: ${response.data.message}`);
    console.log(`📊 Response length: ${response.data.message.length} characters`);
    console.log(`🎯 Actions: ${JSON.stringify(response.data.actions)}`);
    
    return response.data;
  } catch (error) {
    console.error(`❌ Error testing client request:`, error.response?.data || error.message);
    return null;
  }
}

// Teste pentru diferite tipuri de business
async function runTests() {
  console.log('🚀 Starting Role-Based Access Control Tests');
  console.log(`🌐 Testing against: ${BASE_URL}`);
  console.log(`🏢 Business ID: ${TEST_BUSINESS_ID}`);
  console.log(`📍 Location ID: ${TEST_LOCATION_ID}`);
  
  const testCases = [
    // Teste pentru cabinet dental
    {
      businessType: 'dental',
      operatorTests: [
        'Listează toate rezervările de azi',
        'Caută pacientul cu numele "Ionescu"',
        'Modifică rezervarea pentru ora 14:00',
        'Arată-mi istoricul pacientului cu ID 123'
      ],
      clientTests: [
        'Ce servicii oferiți?',
        'Care sunt prețurile pentru consultații?',
        'Vreau să fac o programare',
        'Ce medici sunt disponibili?'
      ]
    },
    
    // Teste pentru sală de fitness
    {
      businessType: 'gym',
      operatorTests: [
        'Listează toți membrii activi',
        'Caută membru cu numele "Popescu"',
        'Modifică abonamentul pentru membru 456',
        'Arată-mi istoricul membrului cu ID 789'
      ],
      clientTests: [
        'Ce tipuri de abonamente aveți?',
        'Care sunt prețurile pentru abonamente?',
        'Vreau să mă înscriu la sală',
        'Ce antrenori sunt disponibili?'
      ]
    },
    
    // Teste pentru hotel
    {
      businessType: 'hotel',
      operatorTests: [
        'Listează toate rezervările pentru weekend',
        'Caută client cu numele "Marinescu"',
        'Modifică rezervarea pentru camera 205',
        'Arată-mi istoricul clientului cu ID 321'
      ],
      clientTests: [
        'Ce tipuri de camere aveți?',
        'Care sunt prețurile pentru camere?',
        'Vreau să fac o rezervare',
        'Ce servicii oferiți?'
      ]
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🏥 Testing ${testCase.businessType.toUpperCase()} business type`);
    console.log('=' .repeat(50));
    
    // Teste pentru operatori
    console.log('\n👨‍💼 OPERATOR TESTS:');
    for (const testMessage of testCase.operatorTests) {
      await testOperatorRequest(testMessage);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Pause between tests
    }
    
    // Teste pentru clienți
    console.log('\n👤 CLIENT TESTS:');
    for (const testMessage of testCase.clientTests) {
      await testClientRequest(testMessage);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Pause between tests
    }
  }
  
  console.log('\n🎉 All tests completed!');
  console.log('\n📋 Expected behavior:');
  console.log('🔵 OPERATOR responses should be:');
  console.log('   - Short and concise (max 50 words)');
  console.log('   - Professional and direct');
  console.log('   - Have access to all data');
  console.log('   - Can modify reservations');
  
  console.log('\n🟢 CLIENT responses should be:');
  console.log('   - Friendly and helpful (max 150 words)');
  console.log('   - Guide users to information they need');
  console.log('   - Limited access to personal data');
  console.log('   - Cannot modify existing reservations');
}

// Verificare sănătate serviciu
async function checkHealth() {
  try {
    console.log('🏥 Checking service health...');
    const response = await axios.get(`${BASE_URL}/agent/health`);
    console.log(`✅ Service is healthy: ${JSON.stringify(response.data)}`);
    return true;
  } catch (error) {
    console.error(`❌ Service health check failed:`, error.message);
    return false;
  }
}

// Rulare teste
async function main() {
  console.log('🧪 Role-Based Access Control Test Suite');
  console.log('=====================================');
  
  // Verificare sănătate
  const isHealthy = await checkHealth();
  if (!isHealthy) {
    console.error('❌ Service is not healthy. Please start the AI Agent service first.');
    process.exit(1);
  }
  
  // Rulare teste
  await runTests();
  
  console.log('\n✨ Test suite completed successfully!');
  process.exit(0);
}

// Rulare script
main().catch((error) => {
  console.error('\n💥 Test suite failed:', error);
  process.exit(1);
});
