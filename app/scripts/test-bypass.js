const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function testBypassEnabled() {
  console.log('\n🔍 Testing Lambda Authorizer Bypass (ENABLED)...');
  
  // Test without any authentication headers
  try {
    const response = await axios.get(`${BASE_URL}/auth/profile`);
    console.log('✅ Profile endpoint accessible without auth (bypass enabled):', response.data);
  } catch (error) {
    console.log('❌ Profile endpoint not accessible (bypass disabled):', error.response?.status, error.response?.data?.message);
  }

  // Test protected endpoint
  try {
    const response = await axios.get(`${BASE_URL}/auth/permissions/location123`);
    console.log('✅ Permissions endpoint accessible without auth (bypass enabled):', response.data);
  } catch (error) {
    console.log('❌ Permissions endpoint not accessible (bypass disabled):', error.response?.status, error.response?.data?.message);
  }

  // Test permission check
  try {
    const response = await axios.post(`${BASE_URL}/auth/check-permission/location123/clients/create`);
    console.log('✅ Permission check accessible without auth (bypass enabled):', response.data);
  } catch (error) {
    console.log('❌ Permission check not accessible (bypass disabled):', error.response?.status, error.response?.data?.message);
  }
}

async function testBypassWithMockUser() {
  console.log('\n🔍 Testing Lambda Authorizer Bypass with Mock User...');
  
  // Test with mock user configuration
  try {
    const response = await axios.get(`${BASE_URL}/auth/profile`);
    console.log('✅ Profile endpoint with mock user:', response.data);
    
    if (response.data.user) {
      console.log('   Mock user details:', {
        userId: response.data.user.userId,
        userName: response.data.user.userName,
        businessId: response.data.user.businessId,
        roles: response.data.user.roles
      });
    }
  } catch (error) {
    console.log('❌ Profile endpoint failed:', error.response?.data || error.message);
  }
}

async function testBypassDisabled() {
  console.log('\n🔍 Testing Lambda Authorizer Bypass (DISABLED)...');
  
  // Test without any authentication headers
  try {
    const response = await axios.get(`${BASE_URL}/auth/profile`);
    console.log('❌ Profile endpoint accessible without auth (should be blocked):', response.data);
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Profile endpoint correctly blocked (bypass disabled):', error.response.data);
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

async function testHealthEndpoint() {
  console.log('\n🔍 Testing Health Endpoint (should always be public)...');
  
  try {
    const response = await axios.get(`${BASE_URL}/auth/health`);
    console.log('✅ Health endpoint accessible:', response.data);
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.response?.data || error.message);
  }
}

async function runBypassTests() {
  console.log('🚀 Starting Lambda Authorizer Bypass Tests...');
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log('\n📋 Note: These tests assume the bypass is configured via environment variables:');
  console.log('   LAMBDA_AUTHORIZER_BYPASS=true');
  console.log('   LAMBDA_AUTHORIZER_MOCK_USER=true');
  console.log('   LAMBDA_AUTHORIZER_MOCK_USER_ID=mock-user-123');
  console.log('   LAMBDA_AUTHORIZER_MOCK_USER_NAME=mock.user@example.com');
  console.log('   LAMBDA_AUTHORIZER_MOCK_BUSINESS_ID=mock-business-456');
  
  await testHealthEndpoint();
  await testBypassEnabled();
  await testBypassWithMockUser();
  
  console.log('\n🎉 Bypass tests completed!');
  console.log('\n💡 To disable bypass, set: LAMBDA_AUTHORIZER_BYPASS=false');
  console.log('💡 To disable Lambda authorizer completely, set: LAMBDA_AUTHORIZER_ENABLED=false');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runBypassTests().catch(console.error);
}

module.exports = {
  runBypassTests,
  testBypassEnabled,
  testBypassWithMockUser,
  testBypassDisabled,
  testHealthEndpoint
}; 