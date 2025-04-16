// Script to update the iCal URL for property ID 18
import fetch from 'node-fetch';

const PROPERTY_ID = 18;
const ICAL_URL = 'https://app.guesty.com/api/public/icalendar-dashboard-api/export/7c7a55f6-d047-462e-b848-d32f531d6fcb'; 

async function updateProperty() {
  try {
    console.log(`Updating iCal URL for property ID ${PROPERTY_ID}...`);
    
    // Login to get a token
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'synergy123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Login successful, got cookies');
    
    // Update the property
    const updateResponse = await fetch(`http://localhost:5000/api/properties/${PROPERTY_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        icalUrl: ICAL_URL
      })
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update property: ${updateResponse.status} ${updateResponse.statusText}\n${errorText}`);
    }
    
    const data = await updateResponse.json();
    console.log('Property updated successfully:', data);
    
    // Check if the property was updated
    const getResponse = await fetch(`http://localhost:5000/api/properties/${PROPERTY_ID}`, {
      headers: {
        'Cookie': cookies
      }
    });
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get property: ${getResponse.status} ${getResponse.statusText}`);
    }
    
    const property = await getResponse.json();
    console.log('Property details after update:');
    console.log(`- ID: ${property.id}`);
    console.log(`- Name: ${property.name}`);
    console.log(`- iCal URL: ${property.icalUrl}`);
    
    // Test the calendar endpoint
    console.log(`Testing calendar fetch for property ${PROPERTY_ID}...`);
    const calendarResponse = await fetch(`http://localhost:5000/api/properties/${PROPERTY_ID}/calendar`, {
      headers: {
        'Cookie': cookies
      }
    });
    
    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      throw new Error(`Failed to fetch calendar: ${calendarResponse.status} ${calendarResponse.statusText}\n${errorText}`);
    }
    
    const calendarData = await calendarResponse.json();
    console.log(`Successfully fetched ${calendarData.length} calendar events`);
    if (calendarData.length > 0) {
      console.log('Sample event:', calendarData[0]);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

updateProperty();