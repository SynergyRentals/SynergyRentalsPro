// Test CSV import with authentication
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

async function login() {
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin'
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Login failed: ${error.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    console.log('Login successful');
    return data.token;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

async function importCSV(token) {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream('./test.csv'));
    
    const response = await fetch('http://localhost:5000/api/guesty/import-csv-upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await response.json();
    console.log('CSV import result:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Import error:', error);
    throw error;
  }
}

async function main() {
  try {
    const token = await login();
    await importCSV(token);
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

main();