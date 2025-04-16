// Simple script to test the webhook secret endpoint

const axios = require('axios');

// Step 1: Get a JWT token by logging in
async function login() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('Login response:', response.data);
    return response.data.token;
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    throw error;
  }
}

// Step 2: Use the token to access the webhook secret endpoint
async function getWebhookSecret(token) {
  try {
    const response = await axios.get('http://localhost:5000/api/guesty-management/get-webhook-secret', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('Webhook secret response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Webhook secret error:', error.response?.data || error.message);
    throw error;
  }
}

// Run the test
async function runTest() {
  try {
    console.log('Starting test...');
    const token = await login();
    console.log('Obtained token, fetching webhook secret...');
    const secretResponse = await getWebhookSecret(token);
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed with error:', error.message);
  }
}

runTest();