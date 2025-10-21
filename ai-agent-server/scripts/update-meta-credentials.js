/**
 * Script pentru actualizarea credentials Meta existente în DynamoDB
 * Rulează: node scripts/update-meta-credentials.js
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

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
const BUSINESS_ID = process.env.BUSINESS_ID || 'B0100001';
const LOCATION_ID = process.env.LOCATION_ID || 'L0100001';

async function updateMetaCredentials() {
  try {
    console.log(`📋 Verificare credentials existente pentru businessId: ${BUSINESS_ID}, locationId: ${LOCATION_ID}...`);
    
    // Mai întâi verifică ce există
    const getResult = await dynamoClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        businessId: BUSINESS_ID,
        serviceType: `meta#${LOCATION_ID}`, // Format: meta#L0100001
      },
    }));

    if (getResult.Item) {
      console.log('✅ Găsit record existent:');
      console.log(JSON.stringify(getResult.Item, null, 2));
      console.log('\n');
    } else {
      console.log('⚠️  Nu există record, va fi creat unul nou.\n');
    }

    // Pregătește credentials noi
    const newCredentials = {
      accessToken: process.env.META_ACCESS_TOKEN || '',
      phoneNumberId: process.env.META_PHONE_NUMBER_ID || '',
      appSecret: process.env.META_APP_SECRET || '',
      phoneNumber: process.env.META_PHONE_NUMBER || '',
      pageId: process.env.META_PAGE_ID || '',
      businessAccountId: process.env.META_BUSINESS_ACCOUNT_ID || '',
    };

    console.log('📝 Actualizare credentials cu:');
    console.log('   - accessToken:', newCredentials.accessToken ? `✅ ${newCredentials.accessToken.substring(0, 20)}...` : '❌ GOL');
    console.log('   - phoneNumberId:', newCredentials.phoneNumberId || '❌ GOL');
    console.log('   - appSecret:', newCredentials.appSecret ? `✅ ${newCredentials.appSecret.substring(0, 10)}...` : '❌ GOL');
    console.log('   - phoneNumber:', newCredentials.phoneNumber || '⚠️  GOL (opțional)');
    console.log('   - pageId:', newCredentials.pageId || '⚠️  GOL (opțional, necesar pentru Instagram/Messenger)');
    console.log('   - businessAccountId:', newCredentials.businessAccountId || '⚠️  GOL (opțional)');
    console.log('\n');

    if (!newCredentials.accessToken || !newCredentials.appSecret) {
      console.error('❌ EROARE: META_ACCESS_TOKEN și META_APP_SECRET sunt OBLIGATORII!');
      console.error('\n📋 Setează-le în .env:');
      console.error('   META_ACCESS_TOKEN=your-access-token');
      console.error('   META_APP_SECRET=your-app-secret');
      console.error('   META_PHONE_NUMBER_ID=your-phone-number-id (pentru WhatsApp)');
      console.error('   META_PAGE_ID=your-page-id (pentru Instagram/Messenger)');
      process.exit(1);
    }

    // Update sau Insert
    console.log('💾 Salvare în DynamoDB...');
    await dynamoClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        businessId: BUSINESS_ID,
        serviceType: `meta#${LOCATION_ID}`,
      },
      UpdateExpression: 'SET credentials = :credentials, isActive = :isActive, updatedAt = :updatedAt, #metadata = :metadata',
      ExpressionAttributeNames: {
        '#metadata': 'metadata',
      },
      ExpressionAttributeValues: {
        ':credentials': newCredentials,
        ':isActive': true,
        ':updatedAt': new Date().toISOString(),
        ':metadata': {
          webhookUrl: process.env.META_WEBHOOK_URL || '',
          permissions: ['pages_messaging', 'pages_manage_metadata', 'pages_show_list'],
        },
      },
    }));

    console.log('✅ SUCCESS! Credentials actualizate în DynamoDB.\n');

    // Verifică rezultatul
    console.log('🔍 Verificare finală...');
    const finalResult = await dynamoClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        businessId: BUSINESS_ID,
        serviceType: `meta#${LOCATION_ID}`,
      },
    }));

    if (finalResult.Item) {
      console.log('✅ Credentials salvate corect:');
      console.log('   - businessId:', finalResult.Item.businessId);
      console.log('   - serviceType:', finalResult.Item.serviceType);
      console.log('   - isActive:', finalResult.Item.isActive);
      console.log('   - credentials.accessToken:', finalResult.Item.credentials?.accessToken ? '✅ SET' : '❌ MISSING');
      console.log('   - credentials.phoneNumberId:', finalResult.Item.credentials?.phoneNumberId || '⚠️  NOT SET');
      console.log('   - credentials.appSecret:', finalResult.Item.credentials?.appSecret ? '✅ SET' : '❌ MISSING');
      console.log('   - updatedAt:', finalResult.Item.updatedAt);
    }

    console.log('\n🎉 Gata! Acum încearcă din nou să trimiți un test webhook!');
    
  } catch (error) {
    console.error('❌ Eroare:', error.message);
    console.error('\n🔍 Detalii:', error);
    process.exit(1);
  }
}

// Verifică env vars
console.log('='.repeat(80));
console.log('🔧 UPDATE META CREDENTIALS SCRIPT');
console.log('='.repeat(80));
console.log('\n📋 Environment Variables:\n');
console.log('AWS_REGION:', process.env.AWS_REGION || 'us-east-1 (default)');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ SET' : '❌ MISSING');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ SET' : '❌ MISSING');
console.log('DYNAMODB_EXTERNAL_CREDENTIALS_TABLE:', TABLE_NAME);
console.log('BUSINESS_ID:', BUSINESS_ID);
console.log('LOCATION_ID:', LOCATION_ID);
console.log('\n📋 Meta Credentials:\n');
console.log('META_ACCESS_TOKEN:', process.env.META_ACCESS_TOKEN ? '✅ SET' : '❌ MISSING');
console.log('META_APP_SECRET:', process.env.META_APP_SECRET ? '✅ SET' : '❌ MISSING');
console.log('META_PHONE_NUMBER_ID:', process.env.META_PHONE_NUMBER_ID ? '✅ SET' : '⚠️  NOT SET');
console.log('META_PAGE_ID:', process.env.META_PAGE_ID ? '✅ SET' : '⚠️  NOT SET');
console.log('META_PHONE_NUMBER:', process.env.META_PHONE_NUMBER ? '✅ SET' : '⚠️  NOT SET');
console.log('');
console.log('='.repeat(80));
console.log('\n');

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('❌ AWS credentials lipsesc!');
  console.error('Setează: AWS_ACCESS_KEY_ID și AWS_SECRET_ACCESS_KEY în .env');
  process.exit(1);
}

if (!process.env.META_ACCESS_TOKEN || !process.env.META_APP_SECRET) {
  console.error('❌ Meta credentials lipsesc!');
  console.error('\n📋 Obține-le din Meta Dashboard:');
  console.error('   1. Meta Developer Dashboard → Your App');
  console.error('   2. Settings → Basic:');
  console.error('      - App Secret → META_APP_SECRET');
  console.error('   3. După OAuth flow:');
  console.error('      - Access Token → META_ACCESS_TOKEN');
  console.error('   4. WhatsApp → Configuration:');
  console.error('      - Phone Number ID → META_PHONE_NUMBER_ID');
  console.error('   5. Pentru Instagram/Messenger:');
  console.error('      - Facebook Page ID → META_PAGE_ID');
  console.error('');
  process.exit(1);
}

// Rulează
updateMetaCredentials();

