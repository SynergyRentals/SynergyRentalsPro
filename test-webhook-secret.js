/**
 * Test script for Guesty webhook secret verification
 * This test uses the app's test endpoint rather than trying to hit the main webhook endpoint directly
 */
import axios from 'axios';

async function login() {
  try {
    // Attempt to login as admin
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'password123'
    });
    
    if (loginResponse.data.success && loginResponse.data.token) {
      console.log('Admin login successful');
      return loginResponse.data.token;
    } else {
      console.error('Admin login failed:', loginResponse.data);
      return null;
    }
  } catch (error) {
    console.error('Login error:', error.message);
    return null;
  }
}

async function getWebhookSecret(token) {
  try {
    // Get the webhook secret using the management endpoint
    console.log('\nGetting webhook secret from management endpoint...');
    
    const response = await axios.get('http://localhost:5000/api/guesty-management/get-webhook-secret', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    
    console.log('Webhook secret response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting webhook secret:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

async function runTest() {
  // First try without authentication
  console.log('\n==== Testing webhook secret retrieval without authentication ====');
  await getWebhookSecret();
  
  // Try with authentication
  console.log('\n==== Testing webhook secret retrieval with authentication ====');
  const token = await login();
  if (token) {
    await getWebhookSecret(token);
  }
}

// Run the test
runTest();