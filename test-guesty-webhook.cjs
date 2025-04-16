// CommonJS Module to test the Guesty webhook endpoint
const crypto = require('crypto');
const axios = require('axios');

// For testing purposes only
const TEST_WEBHOOK_SECRET = 'test-webhook-secret-for-signature-validation';

/**
 * Simulate a Guesty webhook request to our endpoint
 */
async function simulateGuestyWebhook() {
  console.log('Simulating a Guesty webhook request...');
  
  try {
    // 1. Create a sample webhook payload
    const webhookPayload = {
      eventId: "test-event-123",
      event: "listing.updated",
      data: { 
        listingId: "list-001", 
        updatedField: "price", 
        newValue: "200",
        _id: "list-001",
        title: "Test Property",
        nickname: "Beach House",
        bedrooms: 3,
        bathrooms: 2
      }
    };
    
    // Convert payload to JSON string - important to use the same string for signature
    const rawBody = JSON.stringify(webhookPayload);
    
    // 2. Generate the HMAC signature using the webhook secret
    const signature = crypto
      .createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');
    
    console.log(`Generated signature: ${signature}`);
    
    // 3. Send the request to our webhook endpoint
    console.log('Sending POST request to /api/webhooks/guesty...');
    
    // Set temporary environment variable for test
    process.env.GUESTY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
    
    const response = await axios.post('http://localhost:5000/api/webhooks/guesty/test', webhookPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Guesty-Signature-V2': signature,
        'Accept': 'application/json'
      }
    });
    
    console.log('\n--- RESPONSE RECEIVED ---');
    console.log(`Status: ${response.status}`);
    console.log('Headers:', response.headers);
    console.log('Body:', response.data);
    
  } catch (error) {
    console.error('\n--- ERROR RESPONSE ---');
    console.error(`Status: ${error.response?.status || 'Unknown'}`);
    console.error('Headers:', error.response?.headers || 'None');
    console.error('Body:', error.response?.data || error.message);
    
    // Check if it's a configuration issue
    if (!process.env.GUESTY_WEBHOOK_SECRET) {
      console.error('\nError: GUESTY_WEBHOOK_SECRET environment variable is not set.');
      console.error('For this test to work, the same webhook secret must be set in both the script and server.');
    }
  }
}

// Run the simulation
simulateGuestyWebhook();