// Simple test to verify frontend login logic
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3012/api';

async function testFrontendLogin() {
  console.log('🔍 Testing Frontend Login Logic...\n');

  // Test phone number login (what frontend will send)
  const phoneLoginPayload = {
    phone: '9512087058',
    password: '12345678'
  };

  // Test username login
  const usernameLoginPayload = {
    username: 'admin',
    password: 'admin123'
  };

  try {
    console.log('📱 Testing phone login payload:');
    console.log(JSON.stringify(phoneLoginPayload, null, 2));
    
    const phoneResponse = await axios.post(`${API_BASE_URL}/auth/login`, phoneLoginPayload);
    console.log('✅ Phone login successful!');
    console.log('Token received:', phoneResponse.data.access_token ? 'Yes' : 'No');
    
    // Decode token to check role
    if (phoneResponse.data.access_token) {
      const payload = JSON.parse(Buffer.from(phoneResponse.data.access_token.split('.')[1], 'base64').toString());
      console.log('Role:', payload.role);
      console.log('Username:', payload.username);
    }

  } catch (error) {
    console.log('❌ Phone login failed:', error.response?.data?.message || error.message);
  }

  try {
    console.log('\n👤 Testing username login payload:');
    console.log(JSON.stringify(usernameLoginPayload, null, 2));
    
    const usernameResponse = await axios.post(`${API_BASE_URL}/auth/login`, usernameLoginPayload);
    console.log('✅ Username login successful!');
    console.log('Token received:', usernameResponse.data.access_token ? 'Yes' : 'No');
    
    // Decode token to check role
    if (usernameResponse.data.access_token) {
      const payload = JSON.parse(Buffer.from(usernameResponse.data.access_token.split('.')[1], 'base64').toString());
      console.log('Role:', payload.role);
      console.log('Username:', payload.username);
    }

  } catch (error) {
    console.log('❌ Username login failed:', error.response?.data?.message || error.message);
  }
}

testFrontendLogin();