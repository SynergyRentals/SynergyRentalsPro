/**
 * Test the Guesty webhook test endpoint
 * This is a simpler and more reliable way to test the webhook functionality
 */
import axios from 'axios';

async function testGuestyWebhook() {
  try {
    console.log('Testing Guesty webhook test endpoint...');
    
    // 1. Using sample mode
    console.log('\n--- Testing with Sample Webhook ---');
    const sampleResponse = await axios.post('http://localhost:5000/api/webhooks/guesty/test', {
      sampleType: 'property.created'
    });
    
    console.log('Sample webhook response:');
    console.log(`Status: ${sampleResponse.status}`);
    console.log('Headers:', sampleResponse.headers);
    console.log('Body:', JSON.stringify(sampleResponse.data, null, 2));
    
    // 2. Using Guesty simulation mode
    console.log('\n--- Testing with Guesty Simulation Mode ---');
    const simResponse = await axios.post('http://localhost:5000/api/webhooks/guesty/test', {
      event: 'listing.updated',
      eventId: 'test-event-123',
      data: {
        _id: 'test-property-456',
        title: 'Test Property',
        bedrooms: 3,
        bathrooms: 2
      }
    });
    
    console.log('Simulation webhook response:');
    console.log(`Status: ${simResponse.status}`);
    console.log('Body:', JSON.stringify(simResponse.data, null, 2));
    
    // 3. Using direct mode
    console.log('\n--- Testing with Direct Mode ---');
    const directResponse = await axios.post('http://localhost:5000/api/webhooks/guesty/test', {
      eventType: 'created',
      entityType: 'reservation',
      entityId: 'test-reservation-789',
      eventData: {
        _id: 'test-reservation-789',
        guestName: 'Test Guest',
        checkIn: '2025-05-01',
        checkOut: '2025-05-05',
        status: 'confirmed'
      }
    });
    
    console.log('Direct webhook response:');
    console.log(`Status: ${directResponse.status}`);
    console.log('Body:', JSON.stringify(directResponse.data, null, 2));
    
    console.log('\nAll tests completed successfully');
    
  } catch (error) {
    console.error('Error testing webhook:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testGuestyWebhook();