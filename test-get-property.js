import fetch from 'node-fetch';
import { writeFileSync, readFileSync, existsSync } from 'fs';

async function getProperty() {
  try {
    // Create a cookie jar file to store the session cookie
    const cookieFile = 'cookie.txt';
    
    // First, log in to get a session cookie
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${await loginResponse.text()}`);
    }
    
    // Get user data to confirm login worked
    const userData = await loginResponse.json();
    console.log('Login successful, user data:', userData);
    
    // Create a direct browser fetch that preserves cookies via credentials
    console.log('\nTrying alternate approach with credentials...');
    
    // Direct property request using browser fetch
    try {
      // Create a simple curl command to fetch the property with browser-like cookie handling
      const { exec } = await import('child_process');
      
      exec('curl -s -X GET -v --cookie-jar cookie.txt --cookie cookie.txt -H "Content-Type: application/json" http://localhost:5000/api/auth/login -d \'{"username":"admin","password":"admin123"}\'', (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }
        
        console.log('Login curl output:', stdout);
        console.log('Login curl verbose:', stderr);
        
        // Now fetch the property
        exec('curl -s -X GET --cookie cookie.txt http://localhost:5000/api/units/1', (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            return;
          }
          
          try {
            const propertyData = JSON.parse(stdout);
            console.log('Property data:', JSON.stringify(propertyData, null, 2));
            
            console.log('\nChecking for icalUrl property:');
            console.log('icalUrl exists:', 'icalUrl' in propertyData);
            console.log('icalUrl value:', propertyData.icalUrl);
          } catch (e) {
            console.error('Error parsing property data:', e);
            console.log('Raw response:', stdout);
          }
        });
      });
    } catch (browserError) {
      console.error('Browser approach error:', browserError);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

getProperty();