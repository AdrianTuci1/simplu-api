/**
 * Script pentru salvarea credentials Meta de test în DynamoDB
 * Rulează: node scripts/save-test-meta-credentials.js
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

// Configurare DynamoDB
const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const dynamoClient = DynamoDBDocumentClient.from(dynamoDBClient);

const TABLE_NAME = process.env.DYNAMODB_EXTERNAL_CREDENTIALS_TABLE || 'business-external-credentials';

async function saveTestCredentials() {
  // Credentials pentru businessId: B0100001
  const credentialsB0100001 = {
    businessId: 'B0100001',
    serviceType: 'meta',
    credentials: {
      accessToken: process.env.META_ACCESS_TOKEN || 'TEST_ACCESS_TOKEN_REPLACE_ME',
      phoneNumberId: process.env.META_PHONE_NUMBER_ID || 'TEST_PHONE_NUMBER_ID',
      appSecret: process.env.META_APP_SECRET || 'TEST_APP_SECRET',
      phoneNumber: '+1234567890',
      pageId: process.env.META_PAGE_ID || '', // Pentru Instagram/Messenger
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {
      webhookUrl: process.env.META_WEBHOOK_URL || 'https://your-ngrok-url.ngrok.io/webhooks/meta',
      permissions: ['pages_messaging', 'pages_manage_metadata'],
    },
  };

  // Credentials pentru businessId: business-1 (dacă acesta e folosit)
  const credentialsBusiness1 = {
    businessId: 'business-1',
    serviceType: 'meta',
    credentials: {
      accessToken: process.env.META_ACCESS_TOKEN || 'TEST_ACCESS_TOKEN_REPLACE_ME',
      phoneNumberId: process.env.META_PHONE_NUMBER_ID || 'TEST_PHONE_NUMBER_ID',
      appSecret: process.env.META_APP_SECRET || 'TEST_APP_SECRET',
      phoneNumber: '+1234567890',
      pageId: process.env.META_PAGE_ID || '',
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {
      webhookUrl: process.env.META_WEBHOOK_URL || 'https://your-ngrok-url.ngrok.io/webhooks/meta',
      permissions: ['pages_messaging', 'pages_manage_metadata'],
    },
  };

  try {
    console.log('📝 Salvez credentials pentru businessId: B0100001...');
    await dynamoClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: credentialsB0100001,
    }));
    console.log('✅ Credentials salvate pentru B0100001!');

    console.log('\n📝 Salvez credentials pentru businessId: business-1...');
    await dynamoClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: credentialsBusiness1,
    }));
    console.log('✅ Credentials salvate pentru business-1!');

    console.log('\n🎉 SUCCESS! Credentials de test salvate în DynamoDB.');
    console.log('\n📋 Ce am salvat:');
    console.log('   - businessId: B0100001');
    console.log('   - businessId: business-1');
    console.log('   - serviceType: meta');
    console.log('   - accessToken:', process.env.META_ACCESS_TOKEN ? '✅ FROM ENV' : '⚠️ USING TEST VALUE');
    console.log('   - phoneNumberId:', process.env.META_PHONE_NUMBER_ID ? '✅ FROM ENV' : '⚠️ USING TEST VALUE');
    console.log('   - appSecret:', process.env.META_APP_SECRET ? '✅ FROM ENV' : '⚠️ USING TEST VALUE');
    console.log('\n⚠️  IMPORTANT: Dacă vezi "TEST VALUE", actualizează .env cu credentials reale!');
    
  } catch (error) {
    console.error('❌ Eroare la salvarea credentials:', error);
    console.error('\n🔍 Verifică:');
    console.error('   1. AWS credentials sunt configurate (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)');
    console.error('   2. DynamoDB table există:', TABLE_NAME);
    console.error('   3. IAM permissions pentru PutItem');
    process.exit(1);
  }
}

// Verifică env vars
console.log('🔍 Verificare environment variables...\n');
console.log('AWS_REGION:', process.env.AWS_REGION || 'us-east-1 (default)');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ SET' : '❌ MISSING');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ SET' : '❌ MISSING');
console.log('DYNAMODB_EXTERNAL_CREDENTIALS_TABLE:', TABLE_NAME);
console.log('META_ACCESS_TOKEN:', process.env.META_ACCESS_TOKEN ? '✅ SET' : '⚠️  NOT SET (will use test value)');
console.log('META_PHONE_NUMBER_ID:', process.env.META_PHONE_NUMBER_ID ? '✅ SET' : '⚠️  NOT SET (will use test value)');
console.log('META_APP_SECRET:', process.env.META_APP_SECRET ? '✅ SET' : '⚠️  NOT SET (will use test value)');
console.log('\n');

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('❌ AWS credentials lipsesc! Configurează AWS_ACCESS_KEY_ID și AWS_SECRET_ACCESS_KEY');
  process.exit(1);
}

// Rulează
saveTestCredentials();

