const axios = require('axios');

async function testPaymentMethodsEndpoint() {
  try {
    console.log('Testing GET /users/me/payment-methods endpoint...');
    
    // Note: This test requires a valid JWT token
    // You'll need to replace this with a real token from your authentication
    const token = 'YOUR_JWT_TOKEN_HERE';
    
    const response = await axios.get('http://localhost:3001/users/me/payment-methods', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success! Response:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('❌ Error response:', error.response.status, error.response.data);
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

// Run the test
testPaymentMethodsEndpoint(); 