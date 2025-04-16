/**
 * Script to test the property calendar API endpoint for property ID 18
 * This checks if the endpoint correctly handles Property 18 with the Guesty iCal URL
 */

const fetch = require('node-fetch');
require('dotenv').config();

// Define variables
const PROPERTY_ID = 18;
const BASE_URL = 'http://localhost:5000'; // Adjust if needed

// Helper to get an authentication token
async function login() {
  console.log('Logging in...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Successfully logged in');
    return data.token;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Function to test the calendar endpoint
async function testCalendarEndpoint(token) {
  console.log(`Testing calendar endpoint for property ID ${PROPERTY_ID}...`);
  
  try {
    // First, get the property details
    const propertyResponse = await fetch(`${BASE_URL}/api/properties/${PROPERTY_ID}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!propertyResponse.ok) {
      throw new Error(`Failed to fetch property: ${propertyResponse.status} ${propertyResponse.statusText}`);
    }
    
    const property = await propertyResponse.json();
    console.log(`Found property: ${property.name} (ID: ${property.id})`);
    console.log(`Property iCal URL: ${property.icalUrl || 'Not set'}`);
    console.log(`Property source: ${property.source || 'Not specified'}`);
    
    // Now test the calendar endpoint
    console.log(`\nFetching calendar events from unified endpoint...`);
    const calendarResponse = await fetch(`${BASE_URL}/api/properties/${PROPERTY_ID}/calendar`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!calendarResponse.ok) {
      throw new Error(`Calendar API failed: ${calendarResponse.status} ${calendarResponse.statusText}`);
    }
    
    const calendarEvents = await calendarResponse.json();
    console.log(`Successfully fetched calendar events.`);
    console.log(`Number of events: ${calendarEvents.length}`);
    
    // Display the first few events if available
    if (calendarEvents.length > 0) {
      console.log('\nSample events:');
      calendarEvents.slice(0, 3).forEach((event, idx) => {
        console.log(`Event ${idx+1}:`);
        console.log(`  Title: ${event.title}`);
        console.log(`  Start: ${new Date(event.start).toLocaleString()}`);
        console.log(`  End: ${new Date(event.end).toLocaleString()}`);
        console.log(`  Status: ${event.status}`);
        console.log('');
      });
    }
    
    return {
      property,
      calendarEvents
    };
  } catch (error) {
    console.error('Error testing calendar endpoint:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    // Login first to get a token
    const token = await login();
    
    // Test the calendar endpoint
    await testCalendarEndpoint(token);
    
  } catch (error) {
    console.error('Script execution failed:', error);
  }
}

// Run the script
main().catch(console.error);