const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

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

// Headers for Lambda authorizer
const getAuthHeaders = () => ({
  'x-authorizer-user-id': sampleLambdaAuthorizerResponse.userId,
  'x-authorizer-user-name': sampleLambdaAuthorizerResponse.userName,
  'x-authorizer-business-id': sampleLambdaAuthorizerResponse.businessId,
  'x-authorizer-roles': JSON.stringify(sampleLambdaAuthorizerResponse.roles)
});

async function testGetUserPermissions() {
  console.log('\n🔍 Testing Get User Permissions...');
  try {
    const locationId = sampleLambdaAuthorizerResponse.roles[0].locationId;
    const response = await axios.get(`${BASE_URL}/auth/permissions/${locationId}`, {
      headers: getAuthHeaders()
    });
    console.log('✅ Get user permissions passed:', response.data);
  } catch (error) {
    console.log('❌ Get user permissions failed:', error.response?.data || error.message);
  }
}

async function testGetUserPermissionsAllLocations() {
  console.log('\n🔍 Testing Get User Permissions All Locations...');
  try {
    const response = await axios.get(`${BASE_URL}/auth/permissions`, {
      headers: getAuthHeaders()
    });
    console.log('✅ Get user permissions all locations passed:', response.data);
  } catch (error) {
    console.log('❌ Get user permissions all locations failed:', error.response?.data || error.message);
  }
}

async function testCheckPermission() {
  console.log('\n🔍 Testing Check Permission...');
  try {
    const locationId = sampleLambdaAuthorizerResponse.roles[0].locationId;
    const response = await axios.post(
      `${BASE_URL}/auth/check-permission/${locationId}/clients/create`,
      {},
      { headers: getAuthHeaders() }
    );
    console.log('✅ Check permission passed:', response.data);
  } catch (error) {
    console.log('❌ Check permission failed:', error.response?.data || error.message);
  }
}

async function testCheckPermissionDenied() {
  console.log('\n🔍 Testing Check Permission (Should be denied for viewer role)...');
  try {
    // Test with a permission that should be denied for viewer role
    const locationId = sampleLambdaAuthorizerResponse.roles[1].locationId; // Branch Office with manager role
    const response = await axios.post(
      `${BASE_URL}/auth/check-permission/${locationId}/roles/delete`,
      {},
      { headers: getAuthHeaders() }
    );
    console.log('❌ Check permission should have been denied but succeeded:', response.data);
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('✅ Check permission correctly denied:', error.response.data);
    } else {
      console.log('❌ Check permission failed with unexpected error:', error.response?.data || error.message);
    }
  }
}

async function testTestPermissions() {
  console.log('\n🔍 Testing Multiple Permissions...');
  try {
    const locationId = sampleLambdaAuthorizerResponse.roles[0].locationId;
    const permissions = [
      { resourceType: 'clients', action: 'create' },
      { resourceType: 'clients', action: 'read' },
      { resourceType: 'invoices', action: 'delete' },
      { resourceType: 'roles', action: 'create' },
      { resourceType: 'appointments', action: 'read' }
    ];

    const response = await axios.post(
      `${BASE_URL}/auth/test-permissions/${locationId}`,
      { permissions },
      { headers: getAuthHeaders() }
    );
    console.log('✅ Test multiple permissions passed:', response.data);
  } catch (error) {
    console.log('❌ Test multiple permissions failed:', error.response?.data || error.message);
  }
}

async function testPermissionWithDifferentRoles() {
  console.log('\n🔍 Testing Permissions with Different Roles...');
  
  // Test admin role
  try {
    const adminLocationId = sampleLambdaAuthorizerResponse.roles[0].locationId;
    const response = await axios.post(
      `${BASE_URL}/auth/check-permission/${adminLocationId}/clients/delete`,
      {},
      { headers: getAuthHeaders() }
    );
    console.log('✅ Admin role permission test passed:', response.data);
  } catch (error) {
    console.log('❌ Admin role permission test failed:', error.response?.data || error.message);
  }

  // Test manager role
  try {
    const managerLocationId = sampleLambdaAuthorizerResponse.roles[1].locationId;
    const response = await axios.post(
      `${BASE_URL}/auth/check-permission/${managerLocationId}/clients/update`,
      {},
      { headers: getAuthHeaders() }
    );
    console.log('✅ Manager role permission test passed:', response.data);
  } catch (error) {
    console.log('❌ Manager role permission test failed:', error.response?.data || error.message);
  }
}

async function testInvalidLocation() {
  console.log('\n🔍 Testing Invalid Location Access...');
  try {
    const invalidLocationId = 'invalid-location-123';
    const response = await axios.get(`${BASE_URL}/auth/permissions/${invalidLocationId}`, {
      headers: getAuthHeaders()
    });
    console.log('❌ Invalid location should have been denied but succeeded:', response.data);
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('✅ Invalid location correctly denied:', error.response.data);
    } else {
      console.log('❌ Invalid location failed with unexpected error:', error.response?.data || error.message);
    }
  }
}

async function testUnauthorizedAccess() {
  console.log('\n🔍 Testing Unauthorized Access...');
  try {
    const response = await axios.get(`${BASE_URL}/auth/permissions/location123`);
    console.log('❌ Unauthorized access should have been denied but succeeded:', response.data);
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Unauthorized access correctly blocked:', error.response.data);
    } else {
      console.log('❌ Unauthorized access failed with unexpected error:', error.response?.data || error.message);
    }
  }
}

async function runAllPermissionTests() {
  console.log('🚀 Starting Permission System Tests...');
  console.log(`📍 Testing against: ${BASE_URL}`);
  
  await testGetUserPermissions();
  await testGetUserPermissionsAllLocations();
  await testCheckPermission();
  await testCheckPermissionDenied();
  await testTestPermissions();
  await testPermissionWithDifferentRoles();
  await testInvalidLocation();
  await testUnauthorizedAccess();
  
  console.log('\n🎉 All permission tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllPermissionTests().catch(console.error);
}

module.exports = {
  runAllPermissionTests,
  sampleLambdaAuthorizerResponse,
  getAuthHeaders
}; 