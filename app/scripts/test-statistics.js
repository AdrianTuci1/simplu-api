#!/usr/bin/env node

/**
 * Test script for Statistics API
 * Tests all statistics endpoints including new features:
 * - Daily revenue (today/yesterday)
 * - Visits statistics
 * - Pickup automation statistics
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  businessId: process.env.BUSINESS_ID || 'business-123',
  locationId: process.env.LOCATION_ID || 'location-456',
  authToken: process.env.AUTH_TOKEN || 'test-token',
  timeout: 10000,
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      timeout: config.timeout,
      ...options,
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers,
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Test functions
async function testBusinessStatistics() {
  console.log('\n🧪 Testing Business Statistics (Comprehensive)...');
  
  const url = `${config.baseUrl}/api/resources/${config.businessId}-${config.locationId}/statistics/business`;
  
  try {
    const response = await makeRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.authToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status: ${response.status}`);
    
    if (response.status === 200 && response.data.success) {
      const stats = response.data.data;
      console.log('✅ Business Statistics retrieved successfully');
      console.log(`📊 Appointments today: ${stats.appointments?.today || 0}`);
      console.log(`👥 Clients this month: ${stats.clients?.thisMonth || 0}`);
      console.log(`👤 Visits today: ${stats.visits?.today || 0}`);
      console.log(`💰 Revenue this month: ${stats.revenue?.thisMonth || 0}`);
      console.log(`💰 Revenue today: ${stats.revenue?.today || 0}`);
      console.log(`📦 Pickups today: ${stats.pickupAutomation?.today || 0}`);
      console.log(`📦 Pickup success rate: ${stats.pickupAutomation?.successRate || 0}%`);
      console.log(`📦 Inventory products: ${stats.inventory?.totalProducts || 0}`);
    } else {
      console.log('❌ Failed to retrieve business statistics');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error testing business statistics:', error.message);
  }
}

async function testVisitStatistics() {
  console.log('\n🧪 Testing Visit Statistics...');
  
  const url = `${config.baseUrl}/api/resources/${config.businessId}-${config.locationId}/statistics/visits`;
  
  try {
    const response = await makeRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.authToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status: ${response.status}`);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Visit Statistics retrieved successfully');
      console.log(`👤 Visits today: ${response.data.data?.total || 0}`);
    } else {
      console.log('❌ Failed to retrieve visit statistics');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error testing visit statistics:', error.message);
  }
}

async function testPickupStatistics() {
  console.log('\n🧪 Testing Pickup Automation Statistics...');
  
  const url = `${config.baseUrl}/api/resources/${config.businessId}-${config.locationId}/statistics/pickups`;
  
  try {
    const response = await makeRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.authToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status: ${response.status}`);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Pickup Statistics retrieved successfully');
      console.log(`📦 Total pickups: ${response.data.data?.total || 0}`);
      console.log(`📦 Automated pickups: ${response.data.data?.byStatus?.automated || 0}`);
    } else {
      console.log('❌ Failed to retrieve pickup statistics');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error testing pickup statistics:', error.message);
  }
}

async function testDailyRevenueStatistics() {
  console.log('\n🧪 Testing Daily Revenue Statistics...');
  
  const url = `${config.baseUrl}/api/resources/${config.businessId}-${config.locationId}/statistics/revenue/monthly?months=1`;
  
  try {
    const response = await makeRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.authToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status: ${response.status}`);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Daily Revenue Statistics retrieved successfully');
      console.log(`💰 Total revenue: ${response.data.data?.totalRevenue || 0}`);
      console.log(`💰 Average per month: ${response.data.data?.averagePerMonth || 0}`);
    } else {
      console.log('❌ Failed to retrieve daily revenue statistics');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error testing daily revenue statistics:', error.message);
  }
}

async function createTestData() {
  console.log('\n📝 Creating test data for statistics...');
  
  const testResources = [
    {
      resourceType: 'visits',
      data: {
        clientId: 'client-001',
        visitDate: new Date().toISOString(),
        duration: 30,
        notes: 'Test visit',
      }
    },
    {
      resourceType: 'pickups',
      data: {
        orderId: 'order-001',
        isAutomated: true,
        isSuccessful: true,
        pickupDate: new Date().toISOString(),
        notes: 'Test automated pickup',
      }
    },
    {
      resourceType: 'invoices',
      data: {
        clientId: 'client-001',
        total: 150.00,
        amount: 150.00,
        invoiceDate: new Date().toISOString(),
        status: 'paid',
      }
    }
  ];

  for (const resource of testResources) {
    try {
      const url = `${config.baseUrl}/api/resources/${config.businessId}-${config.locationId}`;
      const response = await makeRequest(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.authToken}`,
          'Content-Type': 'application/json',
          'X-Resource-Type': resource.resourceType,
        },
        body: JSON.stringify({
          operation: 'create',
          data: resource.data,
        }),
      });

      if (response.status === 201 || response.status === 200) {
        console.log(`✅ Created test ${resource.resourceType} resource`);
      } else {
        console.log(`⚠️  Failed to create test ${resource.resourceType} resource (${response.status})`);
      }
    } catch (error) {
      console.log(`⚠️  Error creating test ${resource.resourceType} resource:`, error.message);
    }
  }
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting Statistics API Tests');
  console.log(`📍 Base URL: ${config.baseUrl}`);
  console.log(`🏢 Business ID: ${config.businessId}`);
  console.log(`📍 Location ID: ${config.locationId}`);
  
  try {
    // Create test data first
    await createTestData();
    
    // Wait a moment for data to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Run statistics tests
    await testBusinessStatistics();
    await testVisitStatistics();
    await testPickupStatistics();
    await testDailyRevenueStatistics();
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testBusinessStatistics,
  testVisitStatistics,
  testPickupStatistics,
  testDailyRevenueStatistics,
};
