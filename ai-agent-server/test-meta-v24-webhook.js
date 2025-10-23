#!/usr/bin/env node

/**
 * Test script pentru Meta webhook v24 format
 * Simulează un mesaj real de la Meta API v24
 */

const testPayload = {
  "object": "page",
  "entry": [
    {
      "id": "23245",
      "changes": [
        {
          "field": "messages",
          "value": {
            "sender": {
              "id": "12334"
            },
            "recipient": {
              "id": "23245"
            },
            "timestamp": "1527459824",
            "message": {
              "mid": "test_message_id",
              "text": "Bună ziua! Aș vrea să fac o programare la dentist.",
              "commands": [
                {
                  "name": "booking_request"
                }
              ]
            }
          }
        }
      ]
    }
  ]
};

async function testMetaWebhook() {
  const webhookUrl = 'http://localhost:3003/webhooks/meta';
  
  console.log('🧪 Testing Meta webhook v24 format...');
  console.log('📦 Payload:', JSON.stringify(testPayload, null, 2));
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'sha256=test-signature', // Will be skipped in debug mode
      },
      body: JSON.stringify(testPayload),
    });

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Success response:', JSON.stringify(result, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ Error response:', error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Run test if called directly
if (require.main === module) {
  testMetaWebhook();
}

module.exports = { testMetaWebhook, testPayload };
