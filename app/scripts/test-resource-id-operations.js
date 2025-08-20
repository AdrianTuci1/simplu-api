#!/usr/bin/env node

/**
 * Test script to verify resource ID operations (update, patch, delete)
 * This script tests that operations use resource_id correctly
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const BUSINESS_ID = process.env.BUSINESS_ID || 'dental-clinic';
const LOCATION_ID = process.env.LOCATION_ID || 'location1';

// Test data
const testClientData = {
  name: "Test Client for ID Operations",
  email: "test-id-ops@example.com",
  phone: "+40123456789",
  birthYear: 1990,
  gender: "male",
  address: {
    street: "Test Street",
    city: "București",
    country: "România"
  }
};

const updatedClientData = {
  name: "Updated Test Client",
  email: "updated-test@example.com",
  phone: "+40187654321",
  birthYear: 1990,
  gender: "male",
  address: {
    street: "Updated Street",
    city: "București",
    country: "România"
  }
};

const patchedClientData = {
  phone: "+40987654321",
  address: {
    street: "Patched Street",
    city: "București",
    country: "România"
  }
};

// Helper function to make HTTP requests
function makeRequest(method, path, headers = {}, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test functions
async function testCreateClient() {
  console.log('\n🧪 Testing CREATE client...');
  
  try {
    const response = await makeRequest(
      'POST',
      `/api/resources/${BUSINESS_ID}-${LOCATION_ID}`,
      { 'X-Resource-Type': 'clients' },
      { data: testClientData }
    );

    console.log(`Status: ${response.status}`);
    
    if (response.status === 202) {
      console.log('✅ CREATE client test PASSED');
      return response.body.requestId;
    } else {
      console.log('❌ CREATE client test FAILED');
      return null;
    }
  } catch (error) {
    console.log('❌ CREATE client test ERROR:', error.message);
    return null;
  }
}

async function testQueryClient() {
  console.log('\n🧪 Testing QUERY client to get resource_id...');
  
  try {
    const response = await makeRequest(
      'GET',
      `/api/resources/${BUSINESS_ID}-${LOCATION_ID}/clients?page=1&limit=10`
    );

    console.log(`Status: ${response.status}`);
    
    if (response.status === 200 && response.body && response.body.data) {
      const clients = response.body.data;
      const testClient = clients.find(client => 
        client.data && client.data.name === "Test Client for ID Operations"
      );
      
      if (testClient) {
        console.log('✅ Found test client');
        console.log(`Resource ID: ${testClient.resource_id}`);
        return testClient.resource_id;
      } else {
        console.log('❌ Test client not found in query results');
        return null;
      }
    } else {
      console.log('❌ QUERY client test FAILED');
      return null;
    }
  } catch (error) {
    console.log('❌ QUERY client test ERROR:', error.message);
    return null;
  }
}

async function testUpdateClient(resourceId) {
  console.log('\n🧪 Testing UPDATE client with resource_id...');
  
  try {
    const response = await makeRequest(
      'PUT',
      `/api/resources/${BUSINESS_ID}-${LOCATION_ID}/clients/${resourceId}`,
      {},
      { data: updatedClientData }
    );

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));
    
    if (response.status === 202) {
      console.log('✅ UPDATE client test PASSED');
      return true;
    } else {
      console.log('❌ UPDATE client test FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ UPDATE client test ERROR:', error.message);
    return false;
  }
}

async function testPatchClient(resourceId) {
  console.log('\n🧪 Testing PATCH client with resource_id...');
  
  try {
    const response = await makeRequest(
      'PATCH',
      `/api/resources/${BUSINESS_ID}-${LOCATION_ID}/clients/${resourceId}`,
      {},
      { data: patchedClientData }
    );

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));
    
    if (response.status === 202) {
      console.log('✅ PATCH client test PASSED');
      return true;
    } else {
      console.log('❌ PATCH client test FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ PATCH client test ERROR:', error.message);
    return false;
  }
}

async function testDeleteClient(resourceId) {
  console.log('\n🧪 Testing DELETE client with resource_id...');
  
  try {
    const response = await makeRequest(
      'DELETE',
      `/api/resources/${BUSINESS_ID}-${LOCATION_ID}/clients/${resourceId}`
    );

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));
    
    if (response.status === 202) {
      console.log('✅ DELETE client test PASSED');
      return true;
    } else {
      console.log('❌ DELETE client test FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ DELETE client test ERROR:', error.message);
    return false;
  }
}

async function testGetClientById(resourceId) {
  console.log('\n🧪 Testing GET client by resource_id...');
  
  try {
    const response = await makeRequest(
      'GET',
      `/api/resources/${BUSINESS_ID}-${LOCATION_ID}/clients/${resourceId}`
    );

    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ GET client by ID test PASSED');
      console.log('Client data:', JSON.stringify(response.body.data, null, 2));
      return true;
    } else {
      console.log('❌ GET client by ID test FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ GET client by ID test ERROR:', error.message);
    return false;
  }
}

// Main test runner
async function runResourceIdTests() {
  console.log('🚀 Starting Resource ID Operations Tests');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Business ID: ${BUSINESS_ID}`);
  console.log(`Location ID: ${LOCATION_ID}`);
  
  const results = {
    create: false,
    query: false,
    update: false,
    patch: false,
    delete: false,
    getById: false
  };

  let resourceId = null;

  // Run tests
  results.create = await testCreateClient() !== null;

  // Wait for processing
  console.log('\n⏳ Waiting 3 seconds for processing...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  resourceId = await testQueryClient();
  results.query = resourceId !== null;

  if (resourceId) {
    results.update = await testUpdateClient(resourceId);
    
    // Wait for processing
    console.log('\n⏳ Waiting 2 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    results.patch = await testPatchClient(resourceId);
    
    // Wait for processing
    console.log('\n⏳ Waiting 2 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    results.getById = await testGetClientById(resourceId);
    
    // Wait for processing
    console.log('\n⏳ Waiting 2 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    results.delete = await testDeleteClient(resourceId);
  }

  // Summary
  console.log('\n📊 Resource ID Operations Test Results Summary:');
  console.log('===============================================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test.toUpperCase()}: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All resource ID operations tests passed!');
    console.log('✅ CREATE works with business/location');
    console.log('✅ UPDATE works with resource_id');
    console.log('✅ PATCH works with resource_id');
    console.log('✅ DELETE works with resource_id');
    console.log('✅ GET by ID works with resource_id');
    process.exit(0);
  } else {
    console.log('⚠️  Some resource ID operations tests failed.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runResourceIdTests().catch(error => {
    console.error('💥 Resource ID operations test runner error:', error);
    process.exit(1);
  });
}

module.exports = {
  makeRequest,
  testCreateClient,
  testQueryClient,
  testUpdateClient,
  testPatchClient,
  testDeleteClient,
  testGetClientById,
  runResourceIdTests
};
