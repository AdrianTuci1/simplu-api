const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const BUSINESS_ID = process.env.BUSINESS_ID || 'business-123';
const LOCATION_ID = process.env.LOCATION_ID || 'location-456';

// Test data for creating resources
const testData = {
  appointments: [
    {
      data: {
        customerName: 'John Doe',
        service: 'Dental Cleaning',
        date: '2024-01-15',
        time: '10:00',
        duration: 60,
        status: 'confirmed',
        price: 120.00
      }
    },
    {
      data: {
        customerName: 'Jane Smith',
        service: 'Checkup',
        date: '2024-01-15',
        time: '14:00',
        duration: 30,
        status: 'confirmed',
        price: 80.00
      }
    },
    {
      data: {
        customerName: 'Bob Johnson',
        service: 'Treatment',
        date: '2024-01-14',
        time: '11:00',
        duration: 90,
        status: 'completed',
        price: 200.00
      }
    }
  ],
  clients: [
    {
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        registrationDate: '2024-01-01',
        status: 'active'
      }
    },
    {
      data: {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1234567891',
        registrationDate: '2024-01-05',
        status: 'active'
      }
    }
  ],
  invoices: [
    {
      data: {
        invoiceNumber: 'INV-001',
        customerName: 'John Doe',
        items: [
          { description: 'Dental Cleaning', quantity: 1, unitPrice: 120.00, total: 120.00 }
        ],
        subtotal: 120.00,
        tax: 9.60,
        total: 129.60,
        status: 'paid',
        paymentDate: '2024-01-15'
      }
    },
    {
      data: {
        invoiceNumber: 'INV-002',
        customerName: 'Jane Smith',
        items: [
          { description: 'Checkup', quantity: 1, unitPrice: 80.00, total: 80.00 }
        ],
        subtotal: 80.00,
        tax: 6.40,
        total: 86.40,
        status: 'paid',
        paymentDate: '2024-01-15'
      }
    }
  ],
  stocks: [
    {
      data: {
        productName: 'Toothpaste',
        sku: 'TP-001',
        quantity: 50,
        minStock: 10,
        unitPrice: 5.00,
        status: 'in-stock'
      }
    },
    {
      data: {
        productName: 'Dental Floss',
        sku: 'DF-001',
        quantity: 5,
        minStock: 10,
        unitPrice: 3.00,
        status: 'low-stock'
      }
    },
    {
      data: {
        productName: 'Mouthwash',
        sku: 'MW-001',
        quantity: 0,
        minStock: 5,
        unitPrice: 8.00,
        status: 'out-of-stock'
      }
    }
  ]
};

async function createTestResources() {
  console.log('🔄 Creating test resources...');
  
  const resourceTypes = ['timeline', 'clients', 'invoices', 'stocks'];
  
  for (const resourceType of resourceTypes) {
    const resources = testData[resourceType] || [];
    
    for (const resource of resources) {
      try {
        const response = await axios.post(
          `${BASE_URL}/resources/${BUSINESS_ID}-${LOCATION_ID}`,
          resource,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Resource-Type': resourceType
            }
          }
        );
        
        if (response.status === 202) {
          console.log(`✅ Created ${resourceType} resource`);
        }
      } catch (error) {
        console.error(`❌ Error creating ${resourceType} resource:`, error.response?.data || error.message);
      }
    }
  }
  
  // Wait a bit for resources to be processed
  console.log('⏳ Waiting for resources to be processed...');
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function testBusinessStatistics() {
  console.log('\n🎯 Testing MAIN Business Statistics Endpoint (All-in-One)...');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/resources/${BUSINESS_ID}-${LOCATION_ID}/statistics/business`
    );
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ MAIN Business Statistics API working - ALL STATISTICS IN ONE CALL!');
      console.log('📈 Complete Statistics Summary:');
      console.log(`   📅 Appointments: ${response.data.data.appointments.today} today (${response.data.data.appointments.difference > 0 ? '+' : ''}${response.data.data.appointments.difference} vs yesterday)`);
      console.log(`   👥 Clients: ${response.data.data.clients.thisMonth} this month (${response.data.data.clients.difference > 0 ? '+' : ''}${response.data.data.clients.difference} vs last month)`);
      console.log(`   💰 Revenue: $${response.data.data.revenue.thisMonth} this month (${response.data.data.revenue.difference > 0 ? '+' : ''}$${response.data.data.revenue.difference} vs last month)`);
      console.log(`   📦 Inventory: ${response.data.data.inventory.totalProducts} products (${response.data.data.inventory.lowStock} low stock, ${response.data.data.inventory.outOfStock} out of stock)`);
      console.log(`   📊 Summary: $${response.data.data.summary.totalRevenue} total revenue, ${response.data.data.summary.totalClients} clients, ${response.data.data.summary.totalAppointments} appointments`);
    } else {
      console.log('❌ MAIN Business Statistics API failed');
      console.log(response.data);
    }
  } catch (error) {
    console.error('❌ Error testing MAIN Business Statistics:', error.response?.data || error.message);
  }
}

async function testResourceTypeStatistics() {
  console.log('\n📊 Testing Resource Type Statistics...');
  
  const resourceTypes = ['timeline', 'clients', 'invoices', 'stocks'];
  
  for (const resourceType of resourceTypes) {
    try {
      const response = await axios.get(
        `${BASE_URL}/resources/${BUSINESS_ID}-${LOCATION_ID}/statistics/${resourceType}`
      );
      
      if (response.status === 200 && response.data.success) {
        console.log(`✅ ${resourceType} Statistics API working`);
        console.log(`   - Total: ${response.data.data.total}`);
        console.log(`   - Total Value: $${response.data.data.totalValue}`);
      } else {
        console.log(`❌ ${resourceType} Statistics API failed`);
        console.log(response.data);
      }
    } catch (error) {
      console.error(`❌ Error testing ${resourceType} Statistics:`, error.response?.data || error.message);
    }
  }
}

async function testDailyAppointmentStatistics() {
  console.log('\n📊 Testing Daily Appointment Statistics...');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/resources/${BUSINESS_ID}-${LOCATION_ID}/statistics/appointments/daily?days=7`
    );
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Daily Appointment Statistics API working');
      console.log(`   - Days analyzed: ${response.data.data.daysAnalyzed}`);
      console.log(`   - Total appointments: ${response.data.data.totalAppointments}`);
      console.log(`   - Average per day: ${response.data.data.averagePerDay}`);
      console.log(`   - Trend: ${response.data.data.trend}`);
    } else {
      console.log('❌ Daily Appointment Statistics API failed');
      console.log(response.data);
    }
  } catch (error) {
    console.error('❌ Error testing Daily Appointment Statistics:', error.response?.data || error.message);
  }
}

async function testMonthlyRevenueStatistics() {
  console.log('\n📊 Testing Monthly Revenue Statistics...');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/resources/${BUSINESS_ID}-${LOCATION_ID}/statistics/revenue/monthly?months=6`
    );
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Monthly Revenue Statistics API working');
      console.log(`   - Months analyzed: ${response.data.data.monthsAnalyzed}`);
      console.log(`   - Total revenue: $${response.data.data.totalRevenue}`);
      console.log(`   - Average per month: $${response.data.data.averagePerMonth}`);
      console.log(`   - Trend: ${response.data.data.trend}`);
    } else {
      console.log('❌ Monthly Revenue Statistics API failed');
      console.log(response.data);
    }
  } catch (error) {
    console.error('❌ Error testing Monthly Revenue Statistics:', error.response?.data || error.message);
  }
}

async function testDateRangeStatistics() {
  console.log('\n📊 Testing Date Range Statistics...');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/resources/${BUSINESS_ID}-${LOCATION_ID}/statistics/timeline?startDate=2024-01-01&endDate=2024-01-31`
    );
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Date Range Statistics API working');
      console.log(`   - Total resources: ${response.data.data.total}`);
      console.log(`   - Date range: 2024-01-01 to 2024-01-31`);
    } else {
      console.log('❌ Date Range Statistics API failed');
      console.log(response.data);
    }
  } catch (error) {
    console.error('❌ Error testing Date Range Statistics:', error.response?.data || error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Statistics API Tests...\n');
  
  // Create test resources first
  await createTestResources();
  
  // Test MAIN endpoint first (most important)
  await testBusinessStatistics();
  
  // Test other endpoints (optional)
  console.log('\n📊 Testing Additional Endpoints (Optional)...');
  await testResourceTypeStatistics();
  await testDailyAppointmentStatistics();
  await testMonthlyRevenueStatistics();
  await testDateRangeStatistics();
  
  console.log('\n✅ All tests completed!');
  console.log('\n🎯 RECOMMENDATION: Use the MAIN endpoint (/statistics/business) for most use cases - it provides all statistics in one call!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  createTestResources,
  testBusinessStatistics,
  testResourceTypeStatistics,
  testDailyAppointmentStatistics,
  testMonthlyRevenueStatistics,
  testDateRangeStatistics,
  runAllTests
};
