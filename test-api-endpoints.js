/**
 * Integration tests for API endpoints
 * Runs through critical API endpoints to verify they return the expected format and status codes
 */
import axios from 'axios';
import assert from 'assert';

// Base URL for the API
const baseUrl = 'http://localhost:5000';
// Cookie jar for maintaining session
let cookies = '';

/**
 * Helper function to make API requests with session cookie
 */
async function apiRequest(method, path, data = null) {
  try {
    const options = {
      method,
      url: `${baseUrl}${path}`,
      headers: { 
        Cookie: cookies,
        'Content-Type': 'application/json'
      },
      data: data ? JSON.stringify(data) : undefined,
      validateStatus: () => true // Don't throw on non-200 responses
    };
    
    const response = await axios(options);
    
    // Update cookies if Set-Cookie header is present
    if (response.headers['set-cookie']) {
      cookies = response.headers['set-cookie'][0];
    }
    
    return response;
  } catch (error) {
    console.error(`Request failed for ${method} ${path}:`, error.message);
    throw error;
  }
}

/**
 * Login as admin to get a session
 */
async function login() {
  const response = await apiRequest('POST', '/api/auth/login', {
    username: 'admin',
    password: 'password'
  });
  
  assert.equal(response.status, 200, 'Login should return 200 status code');
  assert.equal(typeof response.data.id, 'number', 'Login response should contain user ID');
  
  console.log('✅ Successfully logged in as admin');
  return response.data;
}

/**
 * Test authentication endpoints
 */
async function testAuthEndpoints() {
  console.log('\n--- Testing Authentication Endpoints ---');
  
  // Test GET /api/user
  const response = await apiRequest('GET', '/api/user');
  assert.equal(response.status, 200, '/api/user should return 200 status code');
  assert.equal(typeof response.data.id, 'number', 'User data should contain user ID');
  
  console.log('✅ Authentication endpoints test passed');
}

/**
 * Test property endpoints
 */
async function testPropertyEndpoints() {
  console.log('\n--- Testing Property Endpoints ---');
  
  // Test GET /api/properties
  const response = await apiRequest('GET', '/api/properties');
  assert.equal(response.status, 200, '/api/properties should return 200 status code');
  assert.equal(Array.isArray(response.data), true, 'Properties response should be an array');
  
  // Test property calendar endpoint if properties exist
  if (response.data.length > 0) {
    const propertyId = response.data[0].id;
    const calendarResponse = await apiRequest('GET', `/api/properties/${propertyId}/calendar`);
    assert.equal(calendarResponse.status, 200, '/api/properties/:id/calendar should return 200 status code');
    assert.equal(Array.isArray(calendarResponse.data), true, 'Calendar response should be an array');
    
    console.log(`✅ Successfully fetched calendar for property ID ${propertyId}`);
  }
  
  console.log('✅ Property endpoints test passed');
}

/**
 * Test HostAI endpoints
 */
async function testHostAIEndpoints() {
  console.log('\n--- Testing HostAI Endpoints ---');
  
  // Test GET /api/hostai/tasks
  const tasksResponse = await apiRequest('GET', '/api/hostai/tasks');
  assert.equal(tasksResponse.status, 200, '/api/hostai/tasks should return 200 status code');
  assert.equal(Array.isArray(tasksResponse.data), true, 'Tasks response should be an array');
  assert.equal(tasksResponse.headers['content-type'].includes('application/json'), true, 'Response should have JSON content type');
  
  console.log('✅ Successfully fetched HostAI tasks');
  
  // Test GET /api/settings/hostai-autopilot
  const settingsResponse = await apiRequest('GET', '/api/settings/hostai-autopilot');
  // This might return 404 if the table doesn't exist yet
  if (settingsResponse.status === 200) {
    assert.equal(typeof settingsResponse.data.enabled, 'boolean', 'Settings should contain enabled flag');
    console.log('✅ Successfully fetched HostAI autopilot settings');
  } else {
    console.log('⚠️ HostAI autopilot settings endpoint returned status:', settingsResponse.status);
    console.log('   This is expected if the table does not exist yet. Run create-hostai-autopilot-tables.js to fix.');
  }
  
  console.log('✅ HostAI endpoints test completed');
}

/**
 * Test content type consistency
 */
async function testContentTypeConsistency() {
  console.log('\n--- Testing Content Type Consistency ---');
  
  const endpoints = [
    { method: 'GET', path: '/api/properties' },
    { method: 'GET', path: '/api/hostai/tasks' },
    { method: 'GET', path: '/api/user' }
  ];
  
  for (const endpoint of endpoints) {
    const response = await apiRequest(endpoint.method, endpoint.path);
    assert.equal(response.headers['content-type'].includes('application/json'), true, 
      `${endpoint.method} ${endpoint.path} should return JSON content type`);
    
    console.log(`✅ ${endpoint.method} ${endpoint.path} returns correct content type`);
  }
  
  console.log('✅ Content type consistency test passed');
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    console.log('🧪 Starting API integration tests...');
    
    // Login first to get a session cookie
    await login();
    
    // Run test suites
    await testAuthEndpoints();
    await testPropertyEndpoints();
    await testHostAIEndpoints();
    await testContentTypeConsistency();
    
    console.log('\n✅ All tests passed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();