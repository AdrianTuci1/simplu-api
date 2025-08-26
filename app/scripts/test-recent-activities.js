const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const BUSINESS_ID = 'test-business';
const LOCATION_ID = 'test-location';

async function testRecentActivities() {
  try {
    console.log('🧪 Testing Recent Activities API...\n');

    // Test the recent activities endpoint with X-Resource-Type header
    const response = await axios.get(
      `${BASE_URL}/resources/${BUSINESS_ID}-${LOCATION_ID}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Resource-Type': 'recent-activities',
        },
      }
    );

    console.log('✅ Recent Activities API Response:');
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    console.log('Data:', JSON.stringify(response.data.data, null, 2));
    console.log('Meta:', JSON.stringify(response.data.meta, null, 2));

          if (response.data.success) {
        console.log('\n📊 Recent Activities Summary:');
        console.log(`Total activities: ${response.data.data.length}`);
        
        const appointments = response.data.data.filter(activity => activity.activityType === 'appointment');
        const patients = response.data.data.filter(activity => activity.activityType === 'patient');
        const products = response.data.data.filter(activity => activity.activityType === 'product');
        const pickups = response.data.data.filter(activity => activity.activityType === 'pickup');
        const sales = response.data.data.filter(activity => activity.activityType === 'sale');
        const others = response.data.data.filter(activity => activity.activityType === 'other');
        
        console.log(`Appointments: ${appointments.length}`);
        console.log(`Patients: ${patients.length}`);
        console.log(`Products: ${products.length}`);
        console.log(`Pickups: ${pickups.length}`);
        console.log(`Sales: ${sales.length}`);
        console.log(`Others: ${others.length}`);
        
        if (response.data.data.length > 0) {
          console.log('\n📋 Sample Activities:');
          response.data.data.slice(0, 5).forEach((activity, index) => {
            console.log(`${index + 1}. ${activity.activityType.toUpperCase()}: ${activity.title}`);
            console.log(`   Resource Type: ${activity.resourceType}`);
            console.log(`   Amount: ${activity.amount || 'N/A'}`);
            console.log(`   Status: ${activity.status || 'N/A'}`);
            console.log(`   Updated: ${new Date(activity.updatedAt).toLocaleString()}`);
            console.log(`   Created: ${new Date(activity.createdAt).toLocaleString()}`);
            console.log('');
          });
        }
      }

  } catch (error) {
    console.error('❌ Error testing Recent Activities API:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
  }
}

// Also test the business statistics endpoint for comparison
async function testBusinessStatistics() {
  try {
    console.log('\n🧪 Testing Business Statistics API...\n');

    const response = await axios.get(
      `${BASE_URL}/resources/${BUSINESS_ID}-${LOCATION_ID}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Resource-Type': 'statistics',
        },
      }
    );

    console.log('✅ Business Statistics API Response:');
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    console.log('Data:', JSON.stringify(response.data.data, null, 2));

  } catch (error) {
    console.error('❌ Error testing Business Statistics API:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
  }
}

// Test specific resource type statistics
async function testResourceTypeStatistics() {
  try {
    console.log('\n🧪 Testing Resource Type Statistics API...\n');

    const response = await axios.get(
      `${BASE_URL}/resources/${BUSINESS_ID}-${LOCATION_ID}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Resource-Type': 'appointment',
        },
      }
    );

    console.log('✅ Resource Type Statistics API Response:');
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    console.log('Data:', JSON.stringify(response.data.data, null, 2));

  } catch (error) {
    console.error('❌ Error testing Resource Type Statistics API:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting API Tests...\n');
  
  await testRecentActivities();
  await testBusinessStatistics();
  await testResourceTypeStatistics();
  
  console.log('\n✨ Tests completed!');
}

runTests().catch(console.error);
