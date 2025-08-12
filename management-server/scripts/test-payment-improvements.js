#!/usr/bin/env node

/**
 * Script de testare pentru îmbunătățirile sistemului de plăți
 * 
 * Usage:
 * node scripts/test-payment-improvements.js
 */

const https = require('https');
const http = require('http');

// Configurare
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-test-token-here';
const BUSINESS_ID = process.env.BUSINESS_ID || 'test-business-id';

// Funcții helper
function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        ...headers
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Teste
async function testPaymentMethods() {
  console.log('\n🔍 Testare listare carduri salvate...');
  
  try {
    const response = await makeRequest('GET', '/users/me/payment-methods');
    console.log(`Status: ${response.status}`);
    console.log('Carduri salvate:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Eroare la listarea cardurilor:', error.message);
    return [];
  }
}

async function testAttachPaymentMethod() {
  console.log('\n💳 Testare atașare card nou...');
  
  // Simulează un PaymentMethod ID (în realitate vine de la Stripe)
  const mockPaymentMethodId = 'pm_test_' + Math.random().toString(36).substr(2, 9);
  
  try {
    const response = await makeRequest('POST', '/users/me/payment-methods', {
      paymentMethodId: mockPaymentMethodId
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Răspuns:', response.data);
    return mockPaymentMethodId;
  } catch (error) {
    console.error('❌ Eroare la atașarea cardului:', error.message);
    return null;
  }
}

async function testPayWithSavedCard(paymentMethodId) {
  console.log('\n💸 Testare plată cu cardul salvat...');
  
  try {
    const response = await makeRequest('POST', `/payments/business/${BUSINESS_ID}/pay-with-saved-card`, {
      paymentMethodId,
      planKey: 'basic',
      billingInterval: 'month',
      currency: 'ron'
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Răspuns:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Eroare la plata cu cardul salvat:', error.message);
    return null;
  }
}

async function testSubscriptionStatus() {
  console.log('\n📊 Testare status abonament...');
  
  try {
    const response = await makeRequest('GET', `/payments/business/${BUSINESS_ID}/subscription/status`);
    console.log(`Status: ${response.status}`);
    console.log('Status abonament:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Eroare la verificarea statusului:', error.message);
    return null;
  }
}

async function testInvoices() {
  console.log('\n🧾 Testare listare facturi...');
  
  try {
    const response = await makeRequest('GET', '/payments/invoices');
    console.log(`Status: ${response.status}`);
    console.log('Facturi:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Eroare la listarea facturilor:', error.message);
    return null;
  }
}

async function testWebhookEndpoint() {
  console.log('\n🔗 Testare endpoint webhook...');
  
  // Simulează un webhook Stripe
  const mockWebhook = {
    type: 'invoice.payment_succeeded',
    data: {
      object: {
        id: 'in_test_' + Math.random().toString(36).substr(2, 9),
        subscription: 'sub_test_' + Math.random().toString(36).substr(2, 9),
        customer: 'cus_test_' + Math.random().toString(36).substr(2, 9),
        status: 'paid'
      }
    }
  };
  
  try {
    const response = await makeRequest('POST', '/webhooks/stripe', mockWebhook, {
      'stripe-signature': 'mock_signature_' + Math.random().toString(36).substr(2, 9)
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Răspuns webhook:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Eroare la testarea webhook-ului:', error.message);
    return null;
  }
}

// Funcție principală
async function runTests() {
  console.log('🚀 Începere testare îmbunătățiri sistem plăți...');
  console.log(`📍 URL: ${BASE_URL}`);
  console.log(`🏢 Business ID: ${BUSINESS_ID}`);
  
  // Testează endpoint-urile în ordine
  await testPaymentMethods();
  const paymentMethodId = await testAttachPaymentMethod();
  
  if (paymentMethodId) {
    await testPayWithSavedCard(paymentMethodId);
  }
  
  await testSubscriptionStatus();
  await testInvoices();
  await testWebhookEndpoint();
  
  console.log('\n✅ Testare completă!');
  console.log('\n📝 Note:');
  console.log('- Unele teste pot eșua dacă serverul nu rulează');
  console.log('- Webhook-urile necesită configurarea STRIPE_WEBHOOK_SECRET');
  console.log('- Cardurile de test sunt simulate, nu vor funcționa cu Stripe real');
}

// Rulare
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testPaymentMethods,
  testAttachPaymentMethod,
  testPayWithSavedCard,
  testSubscriptionStatus,
  testInvoices,
  testWebhookEndpoint
}; 