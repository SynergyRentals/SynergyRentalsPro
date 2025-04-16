/**
 * Test the Guesty webhook endpoint with a raw buffer properly formatted
 * Using a simple approach with Node's http module
 */
import http from 'http';
import crypto from 'crypto';

const TEST_WEBHOOK_SECRET = 'test-webhook-secret-for-signature-validation';

async function testWebhookWithBuffer() {
  // Sample webhook payload
  const payload = {
    eventId: "test-event-456",
    event: "listing.updated",
    data: { 
      _id: "property-xyz-123",
      listingId: "property-xyz-123", 
      title: "Updated Beach House",
      bedrooms: 4,
      bathrooms: 2
    }
  };
  
  // Convert to JSON string
  const jsonPayload = JSON.stringify(payload);
  
  // Calculate HMAC signature
  const signature = crypto
    .createHmac('sha256', TEST_WEBHOOK_SECRET)
    .update(Buffer.from(jsonPayload))
    .digest('hex');
  
  console.log(`Generated signature: ${signature}`);
  
  // Prepare request options
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/webhooks/guesty',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(jsonPayload),
      'X-Guesty-Signature-V2': signature
    }
  };
  
  // Send request
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`BODY: ${data}`);
        resolve({ statusCode: res.statusCode, data });
      });
    });
    
    req.on('error', (error) => {
      console.error(`ERROR: ${error.message}`);
      reject(error);
    });
    
    // Write data to request body
    req.write(jsonPayload);
    req.end();
  });
}

// Execute the test
testWebhookWithBuffer()
  .then(result => console.log('Test completed with status:', result.statusCode))
  .catch(error => console.error('Test failed:', error));