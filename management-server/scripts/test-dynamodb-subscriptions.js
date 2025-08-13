#!/usr/bin/env node

/**
 * Script de testare pentru tabelul DynamoDB business-subscriptions
 * 
 * Usage:
 * node scripts/test-dynamodb-subscriptions.js
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

// Configurare
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const TABLE_NAME = process.env.DYNAMODB_SUBSCRIPTIONS_TABLE_NAME || 'business-subscriptions';

// Inițializare client
const ddb = new DynamoDBClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});
const docClient = DynamoDBDocumentClient.from(ddb);

// Funcții helper
async function testTableExists() {
  console.log('\n🔍 Testare existență tabel...');
  
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 1
    }));
    console.log('✅ Tabelul există și este accesibil');
    return true;
  } catch (error) {
    console.error('❌ Eroare la accesarea tabelului:', error.message);
    return false;
  }
}

async function testGSI() {
  console.log('\n🔍 Testare GSI subscriptionId-index...');
  
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'subscriptionId-index',
      KeyConditionExpression: 'subscriptionId = :subscriptionId',
      ExpressionAttributeValues: {
        ':subscriptionId': 'test_subscription_id'
      },
      Limit: 1
    }));
    console.log('✅ GSI funcționează corect');
    return true;
  } catch (error) {
    if (error.name === 'ValidationException' || error.name === 'ResourceNotFoundException') {
      console.log('⚠️  GSI nu există sau nu este configurat corect');
      console.log('   Creează GSI-ul folosind instrucțiunile din DYNAMODB_SUBSCRIPTIONS_SETUP.md');
      return false;
    } else {
      console.error('❌ Eroare la testarea GSI:', error.message);
      return false;
    }
  }
}

async function testWriteAndRead() {
  console.log('\n📝 Testare scriere și citire...');
  
  const testBusinessId = 'test-business-' + Date.now();
  const testSubscriptionId = 'sub_test_' + Date.now();
  const testRecord = {
    id: `business#${testBusinessId}`,
    businessId: testBusinessId,
    subscriptionId: testSubscriptionId,
    customerId: 'cus_test_' + Date.now(),
    priceId: 'price_test_' + Date.now(),
    status: 'active'
  };

  try {
    // Testează scrierea
    console.log('   Scriere înregistrare...');
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: testRecord
    }));
    console.log('   ✅ Scriere reușită');

    // Testează citirea după businessId
    console.log('   Citire după businessId...');
    const getResult = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: `business#${testBusinessId}` }
    }));
    
    if (getResult.Item) {
      console.log('   ✅ Citire după businessId reușită');
      console.log('   Date:', JSON.stringify(getResult.Item, null, 2));
    } else {
      console.log('   ❌ Nu s-a găsit înregistrarea');
    }

    // Testează citirea după subscriptionId (dacă GSI există)
    console.log('   Citire după subscriptionId...');
    try {
      const queryResult = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'subscriptionId-index',
        KeyConditionExpression: 'subscriptionId = :subscriptionId',
        ExpressionAttributeValues: {
          ':subscriptionId': testSubscriptionId
        }
      }));
      
      if (queryResult.Items && queryResult.Items.length > 0) {
        console.log('   ✅ Citire după subscriptionId reușită');
        console.log('   Date:', JSON.stringify(queryResult.Items[0], null, 2));
      } else {
        console.log('   ⚠️  Nu s-a găsit înregistrarea în GSI');
      }
    } catch (error) {
      console.log('   ⚠️  GSI nu este disponibil pentru testare');
    }

    return true;
  } catch (error) {
    console.error('   ❌ Eroare la testarea scrierii/citirii:', error.message);
    return false;
  }
}

async function testScanOperation() {
  console.log('\n🔍 Testare operație scan...');
  
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 5
    }));
    
    console.log(`   ✅ Scan reușit - ${result.Items?.length || 0} înregistrări găsite`);
    
    if (result.Items && result.Items.length > 0) {
      console.log('   Primele înregistrări:');
      result.Items.slice(0, 3).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.businessId} -> ${item.subscriptionId} (${item.status})`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('   ❌ Eroare la scan:', error.message);
    return false;
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Curățare date de test...');
  
  try {
    // Găsește înregistrările de test
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(businessId, :prefix)',
      ExpressionAttributeValues: {
        ':prefix': 'test-business-'
      }
    }));
    
    if (result.Items && result.Items.length > 0) {
      console.log(`   Găsite ${result.Items.length} înregistrări de test pentru ștergere`);
      
      // Șterge înregistrările de test
      for (const item of result.Items) {
        await docClient.send(new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { id: item.id }
        }));
      }
      
      console.log('   ✅ Datele de test au fost șterse');
    } else {
      console.log('   Nu au fost găsite date de test');
    }
    
    return true;
  } catch (error) {
    console.error('   ❌ Eroare la curățarea datelor:', error.message);
    return false;
  }
}

// Funcție principală
async function runTests() {
  console.log('🚀 Începere testare tabel DynamoDB business-subscriptions...');
  console.log(`📍 Tabel: ${TABLE_NAME}`);
  console.log(`🌍 Regiune: ${AWS_REGION}`);
  
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    console.error('❌ Credențialele AWS nu sunt configurate');
    console.log('   Setează AWS_ACCESS_KEY_ID și AWS_SECRET_ACCESS_KEY');
    return;
  }

  const results = {
    tableExists: false,
    gsiWorks: false,
    writeReadWorks: false,
    scanWorks: false,
    cleanupWorks: false
  };

  // Rulează testele
  results.tableExists = await testTableExists();
  
  if (results.tableExists) {
    results.gsiWorks = await testGSI();
    results.writeReadWorks = await testWriteAndRead();
    results.scanWorks = await testScanOperation();
    results.cleanupWorks = await cleanupTestData();
  }

  // Rezumat
  console.log('\n📊 Rezumat Testare:');
  console.log(`   Tabel există: ${results.tableExists ? '✅' : '❌'}`);
  console.log(`   GSI funcționează: ${results.gsiWorks ? '✅' : '⚠️'}`);
  console.log(`   Scriere/Citire: ${results.writeReadWorks ? '✅' : '❌'}`);
  console.log(`   Scan operație: ${results.scanWorks ? '✅' : '❌'}`);
  console.log(`   Curățare date: ${results.cleanupWorks ? '✅' : '❌'}`);

  if (!results.gsiWorks) {
    console.log('\n⚠️  Recomandări:');
    console.log('   1. Creează GSI-ul subscriptionId-index în DynamoDB Console');
    console.log('   2. Vezi DYNAMODB_SUBSCRIPTIONS_SETUP.md pentru instrucțiuni');
  }

  if (results.tableExists && results.writeReadWorks) {
    console.log('\n✅ Tabelul este configurat corect pentru utilizare!');
  } else {
    console.log('\n❌ Sunt probleme cu configurarea tabelului');
  }
}

// Rulare
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testTableExists,
  testGSI,
  testWriteAndRead,
  testScanOperation,
  cleanupTestData
}; 