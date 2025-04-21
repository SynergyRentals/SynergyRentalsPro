import fetch from 'node-fetch';

async function testLogin() {
  try {
    console.log('Testing login with admin credentials...');
    
    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin'
      })
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const user = await response.json();
      console.log('Login successful!', user);
    } else {
      const text = await response.text();
      console.error('Login failed:', text);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();