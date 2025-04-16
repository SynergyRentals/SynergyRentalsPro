const axios = require('axios');

async function getAccessToken() {
  try {
    console.log('Trying to get access token from our temporary endpoint...');
    
    const response = await axios.get('http://localhost:5000/api/guesty-management/get-access-token');
    
    console.log('Response:', {
      status: response.status,
      data: response.data
    });
    
    if (response.data.accessToken) {
      console.log('\nAccess Token: ' + response.data.accessToken);
      console.log('\nYou can use this token to query the Guesty API directly:');
      console.log('curl -X GET "https://open-api.guesty.com/v1/webhooks-v2/secret" \\');
      console.log('     -H "Authorization: Bearer ' + response.data.accessToken + '" \\');
      console.log('     -H "Accept: application/json"');
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
  }
}

getAccessToken();