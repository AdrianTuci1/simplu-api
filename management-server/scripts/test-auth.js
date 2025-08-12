#!/usr/bin/env node

/**
 * Test script pentru validarea autentificării cu Cognito
 * 
 * Usage:
 * node scripts/test-auth.js
 */

const https = require('https');
const http = require('http');

// Configurare
const BASE_URL = process.env.MANAGEMENT_SERVER_URL || 'http://localhost:3001';
const TEST_TOKEN = process.env.TEST_TOKEN || 'invalid_token';

console.log('🧪 Testing Authentication Flow');
console.log('================================');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Test Token: ${TEST_TOKEN.substring(0, 20)}...`);
console.log('');

// Funcție pentru a face request-uri HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Teste
async function runTests() {
  const tests = [
    {
      name: 'Health Check (Public)',
      url: `${BASE_URL}/health`,
      expectedStatus: 200,
    },
    {
      name: 'Root Endpoint (Public)',
      url: `${BASE_URL}/`,
      expectedStatus: 200,
    },
    {
      name: 'Businesses List (Protected - No Auth)',
      url: `${BASE_URL}/businesses`,
      expectedStatus: 401,
    },
    {
      name: 'Businesses List (Protected - Invalid Token)',
      url: `${BASE_URL}/businesses`,
      headers: { 'Authorization': 'Bearer invalid_token' },
      expectedStatus: 401,
    },
    {
      name: 'Businesses List (Protected - Test Token)',
      url: `${BASE_URL}/businesses`,
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` },
      expectedStatus: 200,
    },
  ];

  for (const test of tests) {
    console.log(`\n🔍 Testing: ${test.name}`);
    console.log(`   URL: ${test.url}`);
    
    try {
      const response = await makeRequest(test.url, {
        headers: test.headers,
      });
      
      const statusMatch = response.statusCode === test.expectedStatus;
      const statusIcon = statusMatch ? '✅' : '❌';
      
      console.log(`   Status: ${statusIcon} ${response.statusCode} (expected ${test.expectedStatus})`);
      
      if (response.statusCode !== test.expectedStatus) {
        console.log(`   Response: ${response.body.substring(0, 200)}...`);
      }
      
      if (!statusMatch) {
        console.log(`   ❌ Test failed!`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

// Funcție pentru a verifica variabilele de mediu
function checkEnvironment() {
  console.log('🔧 Environment Check');
  console.log('===================');
  
  const requiredVars = [
    'COGNITO_USER_POOL_ID',
    'COGNITO_CLIENT_ID',
    'AWS_REGION',
  ];
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    const status = value ? '✅' : '❌';
    const displayValue = value ? value.substring(0, 20) + '...' : 'NOT SET';
    
    console.log(`${status} ${varName}: ${displayValue}`);
  }
  
  console.log('');
}

// Rulare
async function main() {
  checkEnvironment();
  await runTests();
  
  console.log('\n🎯 Test Summary');
  console.log('===============');
  console.log('Verifică log-urile server-ului pentru detalii despre autentificare.');
  console.log('Dacă primești 401, verifică:');
  console.log('1. Token-ul este valid și nu a expirat');
  console.log('2. Variabilele de mediu Cognito sunt setate corect');
  console.log('3. AWS credentials au permisiuni pentru Cognito');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { makeRequest, runTests }; 