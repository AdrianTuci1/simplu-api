#!/usr/bin/env node

/**
 * Test script for simplified API structure
 * Tests the new simplified body structure while keeping URL and headers the same
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const BUSINESS_ID = process.env.BUSINESS_ID || 'dental-clinic';
const LOCATION_ID = process.env.LOCATION_ID || 'location1';

// Test data
const testClientData = {
  name: "Test Client",
  email: "test@example.com",
  phone: "+40123456789",
  birthYear: 1990,
  gender: "male",
  address: {
    street: "Test Street",
    city: "București",
    state: "București",
    postalCode: "010000",
    country: "România"
  },
  medicalHistory: "No known issues",
  allergies: [],
  emergencyContact: {
    name: "Emergency Contact",
    phone: "+40187654321",
    relationship: "spouse"
  },
  status: "active",
  category: "regular",
  tags: ["test"],
  notes: "Test client created by script"
};

const testAppointmentData = {
  patientId: "cl24-00001",
  dentistId: "st24-00001",
  appointmentDate: "2024-01-15T10:00:00Z",
  duration: 60,
  treatmentType: "consultation",
  notes: "Test appointment",
  status: "scheduled"
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
    console.log('Response:', JSON.stringify(response.body, null, 2));
    
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

async function testCreateAppointment() {
  console.log('\n🧪 Testing CREATE appointment...');
  
  try {
    const response = await makeRequest(
      'POST',
      `/api/resources/${BUSINESS_ID}-${LOCATION_ID}`,
      { 'X-Resource-Type': 'appointments' },
      { data: testAppointmentData }
    );

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));
    
    if (response.status === 202) {
      console.log('✅ CREATE appointment test PASSED');
      return response.body.requestId;
    } else {
      console.log('❌ CREATE appointment test FAILED');
      return null;
    }
  } catch (error) {
    console.log('❌ CREATE appointment test ERROR:', error.message);
    return null;
  }
}

async function testQueryClients() {
  console.log('\n🧪 Testing QUERY clients...');
  
  try {
    const response = await makeRequest(
      'GET',
      `/api/resources/${BUSINESS_ID}-${LOCATION_ID}/clients?page=1&limit=10`
    );

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));
    
    if (response.status === 200) {
      console.log('✅ QUERY clients test PASSED');
      return true;
    } else {
      console.log('❌ QUERY clients test FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ QUERY clients test ERROR:', error.message);
    return false;
  }
}

async function testQueryAppointments() {
  console.log('\n🧪 Testing QUERY appointments...');
  
  try {
    const response = await makeRequest(
      'GET',
      `/api/resources/${BUSINESS_ID}-${LOCATION_ID}/appointments?page=1&limit=10`
    );

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));
    
    if (response.status === 200) {
      console.log('✅ QUERY appointments test PASSED');
      return true;
    } else {
      console.log('❌ QUERY appointments test FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ QUERY appointments test ERROR:', error.message);
    return false;
  }
}

async function testGetResourceStats() {
  console.log('\n🧪 Testing GET resource stats...');
  
  try {
    const response = await makeRequest(
      'GET',
      `/api/resources/${BUSINESS_ID}-${LOCATION_ID}/stats?resourceType=clients`
    );

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));
    
    if (response.status === 200) {
      console.log('✅ GET resource stats test PASSED');
      return true;
    } else {
      console.log('❌ GET resource stats test FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ GET resource stats test ERROR:', error.message);
    return false;
  }
}

async function testDateRangeQuery() {
  console.log('\n🧪 Testing DATE RANGE query...');
  
  try {
    const response = await makeRequest(
      'GET',
      `/api/resources/${BUSINESS_ID}-${LOCATION_ID}/appointments/date-range?startDate=2024-01-01&endDate=2024-01-31&page=1&limit=10`
    );

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));
    
    if (response.status === 200) {
      console.log('✅ DATE RANGE query test PASSED');
      return true;
    } else {
      console.log('❌ DATE RANGE query test FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ DATE RANGE query test ERROR:', error.message);
    return false;
  }
}

async function testQueryWithDateFilters() {
  console.log('\n🧪 Testing QUERY with date filters...');
  
  try {
    const response = await makeRequest(
      'GET',
      `/api/resources/${BUSINESS_ID}-${LOCATION_ID}/appointments?startDate=2024-01-01&endDate=2024-01-31&page=1&limit=10`
    );

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.body, null, 2));
    
    if (response.status === 200) {
      console.log('✅ QUERY with date filters test PASSED');
      return true;
    } else {
      console.log('❌ QUERY with date filters test FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ QUERY with date filters test ERROR:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Simplified API Tests');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Business ID: ${BUSINESS_ID}`);
  console.log(`Location ID: ${LOCATION_ID}`);
  
  const results = {
    createClient: false,
    createAppointment: false,
    queryClients: false,
    queryAppointments: false,
    getStats: false,
    dateRangeQuery: false,
    queryWithDateFilters: false
  };

  // Run tests
  const clientRequestId = await testCreateClient();
  results.createClient = clientRequestId !== null;

  const appointmentRequestId = await testCreateAppointment();
  results.createAppointment = appointmentRequestId !== null;

  // Wait a bit for processing
  console.log('\n⏳ Waiting 2 seconds for processing...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  results.queryClients = await testQueryClients();
  results.queryAppointments = await testQueryAppointments();
  results.getStats = await testGetResourceStats();
  results.dateRangeQuery = await testDateRangeQuery();
  results.queryWithDateFilters = await testQueryWithDateFilters();

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! API simplification is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please check the API implementation.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test runner error:', error);
    process.exit(1);
  });
}

module.exports = {
  makeRequest,
  testCreateClient,
  testCreateAppointment,
  testQueryClients,
  testQueryAppointments,
  testGetResourceStats,
  testDateRangeQuery,
  testQueryWithDateFilters,
  runTests
};
