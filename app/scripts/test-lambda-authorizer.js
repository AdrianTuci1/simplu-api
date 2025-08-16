const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 3000;

// Sample Lambda authorizer response
const sampleLambdaAuthorizerResponse = {
  userId: "user123",
  userName: "john.doe@example.com",
  businessId: "business456",
  roles: [
    {
      locationId: "location789",
      locationName: "Main Office",
      role: "admin",
      permissions: ["read", "write", "delete"]
    },
    {
      locationId: "location101",
      locationName: "Branch Office",
      role: "manager",
      permissions: ["read", "write"]
    }
  ]
};

// Sample JWT token with Lambda authorizer context
const sampleJWTToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb250ZXh0Ijp7InVzZXJJZCI6InVzZXIxMjMiLCJ1c2VyTmFtZSI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwiYnVzaW5lc3NJZCI6ImJ1c2luZXNzNDU2Iiwicm9sZXMiOlt7ImxvY2F0aW9uSWQiOiJsb2NhdGlvbjc4OSIsImxvY2F0aW9uTmFtZSI6Ik1haW4gT2ZmaWNlIiwicm9sZSI6ImFkbWluIiwicGVybWlzc2lvbnMiOlsicmVhZCIsIndyaXRlIiwiZGVsZXRlIl19XX0sImlhdCI6MTYzNTU5OTk5OSwiZXhwIjoxNjM1Njg2Mzk5fQ.example_signature";

async function testHealthEndpoint() {
  console.log('\n🔍 Testing Health Endpoint...');
  try {
    const response = await axios.get(`${BASE_URL}/auth/health`);
    console.log('✅ Health check passed:', response.data);
  } catch (error) {
    console.log('❌ Health check failed:', error.response?.data || error.message);
  }
}

async function testValidateLambdaAuthorizerResponse() {
  console.log('\n🔍 Testing Lambda Authorizer Response Validation...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/validate-lambda-authorizer`, sampleLambdaAuthorizerResponse);
    console.log('✅ Lambda authorizer response validation passed:', response.data);
  } catch (error) {
    console.log('❌ Lambda authorizer response validation failed:', error.response?.data || error.message);
  }
}

async function testProfileWithHeaders() {
  console.log('\n🔍 Testing Profile Endpoint with Lambda Authorizer Headers...');
  try {
    const headers = {
      'x-authorizer-user-id': sampleLambdaAuthorizerResponse.userId,
      'x-authorizer-user-name': sampleLambdaAuthorizerResponse.userName,
      'x-authorizer-business-id': sampleLambdaAuthorizerResponse.businessId,
      'x-authorizer-roles': JSON.stringify(sampleLambdaAuthorizerResponse.roles)
    };

    const response = await axios.get(`${BASE_URL}/auth/profile`, { headers });
    console.log('✅ Profile with headers passed:', response.data);
  } catch (error) {
    console.log('❌ Profile with headers failed:', error.response?.data || error.message);
  }
}

async function testProfileWithJWT() {
  console.log('\n🔍 Testing Profile Endpoint with JWT Token...');
  try {
    const headers = {
      'Authorization': `Bearer ${sampleJWTToken}`
    };

    const response = await axios.get(`${BASE_URL}/auth/profile`, { headers });
    console.log('✅ Profile with JWT passed:', response.data);
  } catch (error) {
    console.log('❌ Profile with JWT failed:', error.response?.data || error.message);
  }
}

async function testUserRoles() {
  console.log('\n🔍 Testing User Roles Endpoint...');
  try {
    const headers = {
      'x-authorizer-user-id': sampleLambdaAuthorizerResponse.userId,
      'x-authorizer-user-name': sampleLambdaAuthorizerResponse.userName,
      'x-authorizer-business-id': sampleLambdaAuthorizerResponse.businessId,
      'x-authorizer-roles': JSON.stringify(sampleLambdaAuthorizerResponse.roles)
    };

    const response = await axios.get(`${BASE_URL}/auth/roles`, { headers });
    console.log('✅ User roles passed:', response.data);
  } catch (error) {
    console.log('❌ User roles failed:', error.response?.data || error.message);
  }
}

async function testUserRoleForLocation() {
  console.log('\n🔍 Testing User Role for Specific Location...');
  try {
    const headers = {
      'x-authorizer-user-id': sampleLambdaAuthorizerResponse.userId,
      'x-authorizer-user-name': sampleLambdaAuthorizerResponse.userName,
      'x-authorizer-business-id': sampleLambdaAuthorizerResponse.businessId,
      'x-authorizer-roles': JSON.stringify(sampleLambdaAuthorizerResponse.roles)
    };

    const locationId = sampleLambdaAuthorizerResponse.roles[0].locationId;
    const response = await axios.get(`${BASE_URL}/auth/roles/${locationId}`, { headers });
    console.log('✅ User role for location passed:', response.data);
  } catch (error) {
    console.log('❌ User role for location failed:', error.response?.data || error.message);
  }
}

async function testUnauthorizedAccess() {
  console.log('\n🔍 Testing Unauthorized Access...');
  try {
    const response = await axios.get(`${BASE_URL}/auth/profile`);
    console.log('❌ Unauthorized access should have failed but succeeded:', response.data);
  } catch (error) {
    console.log('✅ Unauthorized access correctly blocked:', error.response?.status, error.response?.data?.message);
  }
}

async function testInvalidLambdaAuthorizerResponse() {
  console.log('\n🔍 Testing Invalid Lambda Authorizer Response...');
  try {
    const invalidResponse = {
      userId: "user123",
      // Missing userName and businessId
      roles: []
    };

    const response = await axios.post(`${BASE_URL}/auth/validate-lambda-authorizer`, invalidResponse);
    console.log('❌ Invalid response should have failed but succeeded:', response.data);
  } catch (error) {
    console.log('✅ Invalid response correctly rejected:', error.response?.status, error.response?.data?.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Lambda Authorizer Authentication Tests...');
  console.log(`📍 Testing against: ${BASE_URL}`);
  
  await testHealthEndpoint();
  await testValidateLambdaAuthorizerResponse();
  await testProfileWithHeaders();
  await testProfileWithJWT();
  await testUserRoles();
  await testUserRoleForLocation();
  await testUnauthorizedAccess();
  await testInvalidLambdaAuthorizerResponse();
  
  console.log('\n🎉 All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  sampleLambdaAuthorizerResponse,
  sampleJWTToken
}; 