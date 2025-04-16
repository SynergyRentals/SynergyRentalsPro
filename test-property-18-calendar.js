/**
 * Script to test the property calendar API endpoint for property ID 18
 * This checks if the endpoint correctly handles Property 18 with the Guesty iCal URL
 */

import fetch from 'node-fetch';
import { CookieJar } from 'tough-cookie';
import fetchCookie from 'fetch-cookie';

const PROPERTY_ID = 18;
const LOGIN_CREDENTIALS = {
  username: 'admin',
  password: 'password'
};

// Create a cookie jar to store session cookies
const cookieJar = new CookieJar();
const fetchWithCookies = fetchCookie(fetch, cookieJar);

async function login() {
  console.log('Logging in...');
  
  // Create a session by accessing the main page first
  await fetchWithCookies('http://localhost:5000/');
  
  // Now login to get the session cookie
  const response = await fetchWithCookies('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(LOGIN_CREDENTIALS)
  });
  
  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log('Successfully logged in');
  return data;
}

async function testCalendarEndpoint() {
  console.log(`Testing calendar endpoint for property ID ${PROPERTY_ID}`);
  
  // First, get the property details
  const propertyResponse = await fetchWithCookies(`http://localhost:5000/api/properties/${PROPERTY_ID}`);
  
  if (!propertyResponse.ok) {
    throw new Error(`Failed to get property: ${propertyResponse.status} ${propertyResponse.statusText}`);
  }
  
  const property = await propertyResponse.json();
  console.log(`Property details:`, JSON.stringify(property, null, 2));
  console.log(`Property source: ${property.source || 'Not specified'}`);
  console.log(`Property iCal URL: ${property.icalUrl || 'Not set'}`);
  
  // Now test the calendar endpoint
  console.log(`Fetching calendar data for property ID ${PROPERTY_ID}`);
  const calendarResponse = await fetchWithCookies(`http://localhost:5000/api/properties/${PROPERTY_ID}/calendar`);
  
  if (!calendarResponse.ok) {
    throw new Error(`Failed to get calendar: ${calendarResponse.status} ${calendarResponse.statusText}`);
  }
  
  const calendarData = await calendarResponse.json();
  console.log(`Calendar data received: ${calendarData.length} events`);
  
  if (calendarData.length > 0) {
    console.log('Sample calendar event:', JSON.stringify(calendarData[0], null, 2));
  } else {
    console.log('No calendar events found.');
  }
  
  return { property, calendarData };
}

async function main() {
  try {
    // First login to get cookies
    const userData = await login();
    console.log(`Logged in as ${userData.username} (${userData.role})`);
    
    // Now make the API calls using cookie authentication
    const result = await testCalendarEndpoint();
    
    // Print results summary
    console.log('\nTest Results Summary:');
    console.log('--------------------');
    console.log(`Property ID: ${PROPERTY_ID}`);
    console.log(`Property Name: ${result.property.name}`);
    console.log(`Source: ${result.property.source || 'Not specified'}`);
    console.log(`iCal URL: ${result.property.icalUrl ? 'Set' : 'Not set'}`);
    console.log(`Calendar Events: ${result.calendarData.length}`);
    console.log(`Test Status: ${result.calendarData.length > 0 ? 'SUCCESS' : 'WARNING - No events found'}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// In ES modules, we need to call the function directly
main().catch(err => console.error('Unhandled error:', err));