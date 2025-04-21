import fetch from 'node-fetch';
import tough from 'tough-cookie';
import fetchCookie from 'fetch-cookie';

async function testLoginWithCookies() {
  try {
    console.log('Testing login with cookies');
    
    const cookieJar = new tough.CookieJar();
    const fetchWithCookies = fetchCookie(fetch, cookieJar);
    
    // First, login to get the session cookie
    console.log('Logging in...');
    const loginResponse = await fetchWithCookies('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    const user = await loginResponse.json();
    console.log('Login successful:', user.username);
    
    // Show all cookies
    const cookies = await cookieJar.getCookies('http://localhost:5000');
    console.log('Cookies after login:', cookies.map(c => `${c.key}=${c.value}`));
    
    // Now try to get the user info using the session cookie
    console.log('\nFetching user info...');
    const userResponse = await fetchWithCookies('http://localhost:5000/api/user');
    
    if (!userResponse.ok) {
      throw new Error(`User fetch failed: ${userResponse.status} ${userResponse.statusText}`);
    }
    
    const userInfo = await userResponse.json();
    console.log('User info retrieved successfully:', userInfo.username);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testLoginWithCookies();