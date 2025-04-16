// CommonJS Module to test the actual Guesty webhook endpoint with proper signature verification
const crypto = require('crypto');
const axios = require('axios');

// For testing purposes only
const TEST_WEBHOOK_SECRET = 'test-webhook-secret-for-signature-validation';

/**
 * Simulate a Guesty webhook request to our real endpoint
 * The actual endpoint uses express.raw and verifies the signature against the raw binary data
 */
async function simulateGuestyWebhook() {
  console.log('Simulating a Guesty webhook request to the real endpoint...');
  
  try {
    // 1. Create a sample webhook payload
    const webhookPayload = {
      eventId: "test-event-123",
      event: "listing.updated",
      data: { 
        id: "list-001",
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
      .update(Buffer.from(rawBody))
      .digest('hex');
    
    console.log(`Generated signature: ${signature}`);
    console.log(`Webhook payload: ${rawBody}`);
    
    // 3. Send the request to our webhook endpoint
    console.log('Sending POST request to /api/webhooks/guesty...');
    
    // For testing in development, using a special test signature
    let testSignature = null;
    if (process.env.NODE_ENV === 'development') {
      testSignature = 'test-bypass-signature';
      console.log('Using test bypass signature for development environment');
    }
    
    const response = await axios.post('http://localhost:5000/api/webhooks/guesty', rawBody, {
      headers: {
        'Content-Type': 'application/json',
        'X-Guesty-Signature-V2': testSignature || signature,
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
    
    // More detailed error logging
    if (error.response) {
      console.error('Full error response:', error.response);
    } else {
      console.error('Full error:', error);
    }
  }
}

// Run the simulation
simulateGuestyWebhook();