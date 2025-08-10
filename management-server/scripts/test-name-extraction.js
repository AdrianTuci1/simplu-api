const axios = require('axios');

// Test the name extraction functionality
function testNameExtraction() {
  console.log('Testing name extraction logic...\n');

  // Mock the splitFullName function logic
  function splitFullName(fullName) {
    if (!fullName || typeof fullName !== 'string') {
      return { firstName: '', lastName: '' };
    }

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      return { firstName: '', lastName: '' };
    }

    const nameParts = trimmedName.split(/\s+/);
    
    if (nameParts.length === 1) {
      return { firstName: nameParts[0], lastName: '' };
    }
    
    if (nameParts.length === 2) {
      return { firstName: nameParts[0], lastName: nameParts[1] };
    }
    
    // For names with more than 2 parts, first part is firstName, rest is lastName
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    
    return { firstName, lastName };
  }

  // Test cases
  const testCases = [
    'John Doe',
    'Jane Smith',
    'Michael Johnson',
    'Sarah Wilson',
    'David Brown',
    'Emily Davis',
    'Robert Miller',
    'Lisa Garcia',
    'Dr. John Smith Jr.',
    'Mary Jane Watson',
    'Jean-Claude Van Damme',
    'O\'Connor',
    'José María García',
    'Li Wei Chen',
    '',
    '   ',
    null,
    undefined,
    'SingleName',
    'Multiple Word Last Name'
  ];

  console.log('Name Extraction Test Results:');
  console.log('==============================\n');

  testCases.forEach((testCase, index) => {
    const result = splitFullName(testCase);
    console.log(`${index + 1}. Input: "${testCase}"`);
    console.log(`   Output: firstName="${result.firstName}", lastName="${result.lastName}"`);
    console.log('');
  });
}

// Test the API endpoint with name data
async function testUserProfileWithName() {
  try {
    console.log('Testing user profile with name data...\n');
    
    // Note: This test requires a valid JWT token
    // You'll need to replace this with a real token from your authentication
    const token = 'YOUR_JWT_TOKEN_HERE';
    
    const response = await axios.get('http://localhost:3001/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ User profile response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Check if firstName and lastName are populated
    if (response.data.firstName || response.data.lastName) {
      console.log('\n✅ Name data successfully extracted and stored!');
      console.log(`   firstName: "${response.data.firstName}"`);
      console.log(`   lastName: "${response.data.lastName}"`);
    } else {
      console.log('\n⚠️  No name data found in response');
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Error response:', error.response.status, error.response.data);
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

// Run tests
console.log('Name Extraction and User Profile Tests\n');
console.log('=======================================\n');

testNameExtraction();
console.log('\n' + '='.repeat(50) + '\n');
testUserProfileWithName(); 