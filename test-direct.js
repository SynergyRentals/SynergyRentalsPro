// A direct test to simulate a request with a hardcoded token for testing

import axios from 'axios';

// Use a sample token that you can generate using the /api/auth/debug-token endpoint or JWT library
const SAMPLE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibmFtZSI6IkFkbWluIFVzZXIiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaXNSb290IjpmYWxzZSwiaWF0IjoxNzQ0ODEwMDE4LCJleHAiOjE3NDU0MTQ4MTh9.yLCHwxiT54jOVnBKhxrfoLYuZv11Tsy20iB8O9GhAoU';

async function testEndpoint() {
  try {
    console.log('Testing webhook secret endpoint with direct token...');
    const response = await axios.get('http://localhost:5000/api/guesty-management/get-webhook-secret', {
      headers: {
        'Authorization': `Bearer ${SAMPLE_TOKEN}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('Response:', response.data);
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    console.error('Test failed');
  }
}

testEndpoint();