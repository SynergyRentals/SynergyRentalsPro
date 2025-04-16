// A script to validate our error message for webhook secret retrieval
const axios = require('axios');

/**
 * Test retrieving the webhook secret when it's missing
 */
async function testWebhookSecretRetrieval() {
  try {
    console.log('Testing the webhook secret retrieval endpoint...');
    
    // Make a request to our test endpoint
    const response = await axios.get('http://localhost:5000/api/guesty-management/test-webhook-secret', {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Run the test
testWebhookSecretRetrieval();