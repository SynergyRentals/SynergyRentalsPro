/**
 * Test retrieving the webhook secret when it's missing
 */
import axios from 'axios';

async function testWebhookSecretRetrieval() {
  try {
    console.log('Testing the webhook secret retrieval when it\'s not available...');
    
    // Make sure we're not using the environment variable for this test
    const originalSecret = process.env.GUESTY_WEBHOOK_SECRET;
    delete process.env.GUESTY_WEBHOOK_SECRET;
    
    // Try to get the webhook secret using the non-authenticated endpoint
    const response = await axios.get('http://localhost:5000/api/guesty-management/test-webhook-secret');
    
    console.log('\nResponse from webhook secret endpoint:');
    console.log(`Status: ${response.status}`);
    console.log('Data:', response.data);
    
    // Restore the original environment variable if it existed
    if (originalSecret) {
      process.env.GUESTY_WEBHOOK_SECRET = originalSecret;
    }
    
    return response.data;
  } catch (error) {
    console.error('\nError retrieving webhook secret:');
    console.error(`Status: ${error.response?.status || 'Unknown'}`);
    
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    } else {
      console.error('Error message:', error.message);
    }
    
    // If the error is about auth or credentials, suggest the user set the secret manually
    if (
      error.response?.status === 401 || 
      error.response?.status === 403 ||
      (error.response?.data?.message && error.response?.data?.message.includes('credentials'))
    ) {
      console.log('\n======================================================');
      console.log('RECOMMENDATION:');
      console.log('It appears you don\'t have valid Guesty API credentials.');
      console.log('For testing purposes, you can set the GUESTY_WEBHOOK_SECRET');
      console.log('environment variable directly:');
      console.log('\n  export GUESTY_WEBHOOK_SECRET=your-secret-key');
      console.log('\nFor development testing, you can use this value:');
      console.log('  test-webhook-secret-for-signature-validation');
      console.log('\nFor production, obtain the real secret from your Guesty account');
      console.log('======================================================');
    }
  }
}

// Run the test
testWebhookSecretRetrieval();