// Simple script to test the webhook endpoint with raw buffer
import crypto from 'crypto';
import fs from 'fs';
import https from 'https';
import http from 'http';

const TEST_WEBHOOK_SECRET = 'test-webhook-secret-for-signature-validation';

/**
 * Send a webhook test request using raw Node.js HTTP API
 * This avoids any issues with axios transformation
 */
async function testWebhookWithRawHttp() {
  console.log('Testing webhook endpoint with raw HTTP request...');
  
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
  
  // Convert payload to JSON string
  const rawBody = JSON.stringify(webhookPayload);
  
  // 2. Generate the HMAC signature using the webhook secret
  const signature = crypto
    .createHmac('sha256', TEST_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  
  console.log(`Generated signature: ${signature}`);
  
  // 3. Set up the HTTP request options
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/webhooks/guesty',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(rawBody),
      'X-Guesty-Signature-V2': signature,
      'Accept': 'application/json'
    }
  };
  
  // 4. Send the request
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log(`\nResponse Status Code: ${res.statusCode}`);
      console.log('Response Headers:', res.headers);
      
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log('Response Body:', responseData);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseData
        });
      });
    });
    
    req.on('error', (error) => {
      console.error('Error:', error);
      reject(error);
    });
    
    // Write the raw body to the request
    req.write(rawBody);
    req.end();
  });
}

// Run the test
testWebhookWithRawHttp().catch(console.error);