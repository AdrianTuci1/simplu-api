import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

async function testMetaWebhook() {
  const businessId = 'test-business';
  const testPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'test-entry',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '+40712345678',
            phone_number_id: 'test-phone-id'
          },
          contacts: [{
            profile: { name: 'Test User' },
            wa_id: '+40787654321'
          }],
          messages: [{
            from: '+40787654321',
            id: 'test-message-id',
            timestamp: '1234567890',
            type: 'text',
            text: { body: 'Vreau să fac o rezervare pentru mâine' }
          }]
        },
        field: 'messages'
      }]
    }]
  };

  try {
    const response = await axios.post(
      `${BASE_URL}/webhooks/meta/${businessId}`,
      testPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-hub-signature-256': 'sha256=test-signature'
        }
      }
    );

    console.log('Meta webhook test result:', response.data);
  } catch (error) {
    console.error('Meta webhook test failed:', error.response?.data || error.message);
  }
}

async function testTwilioWebhook() {
  const businessId = 'test-business';
  const testPayload = {
    MessageSid: 'test-message-sid',
    From: '+40787654321',
    To: '+40712345678',
    Body: 'Vreau să fac o rezervare pentru mâine',
    NumMedia: '0',
    AccountSid: 'test-account-sid',
    ApiVersion: '2010-04-01'
  };

  try {
    const response = await axios.post(
      `${BASE_URL}/webhooks/twilio/${businessId}`,
      testPayload,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('Twilio webhook test result:', response.data);
  } catch (error) {
    console.error('Twilio webhook test failed:', error.response?.data || error.message);
  }
}

async function testWebhookEndpoint() {
  const businessId = 'test-business';
  const testData = {
    source: 'meta',
    message: 'Vreau să fac o rezervare pentru mâine',
    userId: '+40787654321'
  };

  try {
    const response = await axios.post(
      `${BASE_URL}/webhooks/test/${businessId}`,
      testData
    );

    console.log('Test webhook result:', response.data);
  } catch (error) {
    console.error('Test webhook failed:', error.response?.data || error.message);
  }
}

// Rulare teste
async function runTests() {
  console.log('Testing webhooks...\n');
  
  console.log('1. Testing Meta webhook:');
  await testMetaWebhook();
  
  console.log('\n2. Testing Twilio webhook:');
  await testTwilioWebhook();
  
  console.log('\n3. Testing webhook endpoint:');
  await testWebhookEndpoint();
}

if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\nAll tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Tests failed:', error);
      process.exit(1);
    });
} 