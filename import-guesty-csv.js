// Import Guesty properties from CSV after login
import fetch from 'node-fetch';

async function login() {
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
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error('Login failed:', data);
    throw new Error('Login failed');
  }
  
  console.log('Login successful');
  return data.token;
}

async function importCSV(token) {
  const response = await fetch('http://localhost:5000/api/guesty/import-csv', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error('CSV import failed:', data);
    throw new Error('CSV import failed');
  }
  
  console.log('CSV import successful:', data);
  return data;
}

// Run the script
async function main() {
  try {
    const token = await login();
    const result = await importCSV(token);
    console.log('Import completed:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();