#!/usr/bin/env node

/**
 * Test script to verify that the data field is properly saved in the database
 * This script tests that the complete JSON data is stored in the data field
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const BUSINESS_ID = process.env.BUSINESS_ID || 'dental-clinic';
const LOCATION_ID = process.env.LOCATION_ID || 'location1';

// Test data with various date fields
const testClientData = {
  name: "Test Client Data Field",
  email: "test-data@example.com",
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
  allergies: ["penicilină"],
  emergencyContact: {
    name: "Emergency Contact",
    phone: "+40187654321",
    relationship: "spouse"
  },
  status: "active",
  category: "regular",
  tags: ["test", "data-field"],
  notes: "Test client for data field verification",
  // Adăugăm câmpuri de date pentru a testa extragerea
  startDate: "2024-01-15T10:00:00Z",
  endDate: "2024-01-15T11:00:00Z"
};

const testAppointmentData = {
  patientId: "cl24-00001",
  dentistId: "st24-00001",
  appointmentDate: "2024-01-15T10:00:00Z",
  duration: 60,
  treatmentType: "consultation",
  notes: "Test appointment for data field verification",
  status: "scheduled",
  // Adăugăm câmpuri de date pentru a testa extragerea
  startDate: "2024-01-15T10:00:00Z",
  endDate: "2024-01-15T11:00:00Z"
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
async function testCreateClientWithDataField() {
  console.log('\n🧪 Testing CREATE client with data field verification...');
  
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

async function testCreateAppointmentWithDataField() {
  console.log('\n🧪 Testing CREATE appointment with data field verification...');
  
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

async function testQueryClientDataField() {
  console.log('\n🧪 Testing QUERY client to verify data field...');
  
  try {
    const response = await makeRequest(
      'GET',
      `/api/resources/${BUSINESS_ID}-${LOCATION_ID}/clients?page=1&limit=10`
    );

    console.log(`Status: ${response.status}`);
    
    if (response.status === 200 && response.body && response.body.data) {
      const clients = response.body.data;
      const testClient = clients.find(client => 
        client.data && client.data.name === "Test Client Data Field"
      );
      
      if (testClient) {
        console.log('✅ Found test client with data field');
        console.log('Client data field:', JSON.stringify(testClient.data, null, 2));
        
        // Verifică că toate câmpurile din testClientData sunt prezente
        const requiredFields = ['name', 'email', 'phone', 'address', 'medicalHistory', 'allergies'];
        const missingFields = requiredFields.filter(field => !testClient.data[field]);
        
        if (missingFields.length === 0) {
          console.log('✅ All required fields are present in data field');
          return true;
        } else {
          console.log('❌ Missing fields in data field:', missingFields);
          return false;
        }
      } else {
        console.log('❌ Test client not found in query results');
        return false;
      }
    } else {
      console.log('❌ QUERY client test FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ QUERY client test ERROR:', error.message);
    return false;
  }
}

async function testQueryAppointmentDataField() {
  console.log('\n🧪 Testing QUERY appointment to verify data field...');
  
  try {
    const response = await makeRequest(
      'GET',
      `/api/resources/${BUSINESS_ID}-${LOCATION_ID}/appointments?page=1&limit=10`
    );

    console.log(`Status: ${response.status}`);
    
    if (response.status === 200 && response.body && response.body.data) {
      const appointments = response.body.data;
      const testAppointment = appointments.find(appointment => 
        appointment.data && appointment.data.notes === "Test appointment for data field verification"
      );
      
      if (testAppointment) {
        console.log('✅ Found test appointment with data field');
        console.log('Appointment data field:', JSON.stringify(testAppointment.data, null, 2));
        
        // Verifică că toate câmpurile din testAppointmentData sunt prezente
        const requiredFields = ['patientId', 'dentistId', 'appointmentDate', 'duration', 'treatmentType', 'notes'];
        const missingFields = requiredFields.filter(field => !testAppointment.data[field]);
        
        if (missingFields.length === 0) {
          console.log('✅ All required fields are present in data field');
          return true;
        } else {
          console.log('❌ Missing fields in data field:', missingFields);
          return false;
        }
      } else {
        console.log('❌ Test appointment not found in query results');
        return false;
      }
    } else {
      console.log('❌ QUERY appointment test FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ QUERY appointment test ERROR:', error.message);
    return false;
  }
}

// Main test runner
async function runDataFieldTests() {
  console.log('🚀 Starting Data Field Verification Tests');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Business ID: ${BUSINESS_ID}`);
  console.log(`Location ID: ${LOCATION_ID}`);
  
  const results = {
    createClient: false,
    createAppointment: false,
    queryClientData: false,
    queryAppointmentData: false
  };

  // Run tests
  const clientRequestId = await testCreateClientWithDataField();
  results.createClient = clientRequestId !== null;

  const appointmentRequestId = await testCreateAppointmentWithDataField();
  results.createAppointment = appointmentRequestId !== null;

  // Wait a bit for processing
  console.log('\n⏳ Waiting 3 seconds for processing...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  results.queryClientData = await testQueryClientDataField();
  results.queryAppointmentData = await testQueryAppointmentDataField();

  // Summary
  console.log('\n📊 Data Field Test Results Summary:');
  console.log('==================================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All data field tests passed! The data field is properly saved and retrieved.');
    process.exit(0);
  } else {
    console.log('⚠️  Some data field tests failed. Please check the database implementation.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runDataFieldTests().catch(error => {
    console.error('💥 Data field test runner error:', error);
    process.exit(1);
  });
}

module.exports = {
  makeRequest,
  testCreateClientWithDataField,
  testCreateAppointmentWithDataField,
  testQueryClientDataField,
  testQueryAppointmentDataField,
  runDataFieldTests
};
