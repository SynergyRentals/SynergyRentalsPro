
// Simple script to test the Guesty full sync endpoint
const http = require('http');

// Get the port from the environment or use the one from server logs
const port = process.env.PORT || 33377; // Use the port from your server logs

const options = {
  hostname: 'localhost',
  port: port,
  path: '/api/admin/guesty/full-sync',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log(`Sending request to http://localhost:${port}/api/admin/guesty/full-sync`);

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:');
    try {
      const parsedData = JSON.parse(data);
      console.log(JSON.stringify(parsedData, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error(`Error with request: ${error.message}`);
});

req.end();
