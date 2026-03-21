/**
 * Direct test of Ola Maps API to understand the response format
 * Run with: node test-ola-api-direct.js
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const testOlaMapsDirect = async () => {
  const API_KEY = process.env.OLA_MAPS_API_KEY;
  
  if (!API_KEY) {
    console.error('❌ OLA_MAPS_API_KEY not found in .env');
    return;
  }

  console.log('🧪 Testing Ola Maps API directly\n');
  console.log('API Key:', API_KEY.substring(0, 10) + '...\n');

  // Test coordinates: Mumbai
  const origin = '19.0760,72.8777';
  const destination = '19.0850,72.8950';

  console.log(`📍 Testing route: ${origin} → ${destination}\n`);

  const testCases = [
    {
      name: 'POST /directions/basic with query params (CORRECT FORMAT)',
      method: 'POST',
      url: `https://api.olamaps.io/routing/v1/directions/basic?origin=${origin}&destination=${destination}&api_key=${API_KEY}`,
      headers: { 'X-Request-Id': 'test-123' }
    },
    {
      name: 'POST /directions/basic without api_key in query',
      method: 'POST',
      url: `https://api.olamaps.io/routing/v1/directions/basic?origin=${origin}&destination=${destination}`,
      headers: { 
        'X-Request-Id': 'test-123',
        'X-API-Key': API_KEY 
      }
    },
    {
      name: 'GET with query params',
      method: 'GET',
      url: `https://api.olamaps.io/routing/v1/directions?origin=${origin}&destination=${destination}&mode=driving&alternatives=true&api_key=${API_KEY}`,
      headers: { 'X-API-Key': API_KEY }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 Trying: ${testCase.name}`);
    console.log(`   URL: ${testCase.url?.substring(0, 80)}...`);
    
    try {
      const config = {
        method: testCase.method,
        url: testCase.url,
        headers: testCase.headers,
        timeout: 10000
      };

      if (testCase.data) {
        config.data = testCase.data;
      }

      const response = await axios(config);
      
      console.log(`   ✅ Success! Status: ${response.status}`);
      console.log(`   Response keys:`, Object.keys(response.data));
      
      if (response.data.routes) {
        console.log(`   Routes found: ${response.data.routes.length}`);
        console.log(`   First route keys:`, Object.keys(response.data.routes[0]));
        
        if (response.data.routes[0].geometry) {
          console.log(`   Geometry type:`, response.data.routes[0].geometry.type);
          console.log(`   Geometry keys:`, Object.keys(response.data.routes[0].geometry));
        }
      }
      
      // Save full response for inspection
      console.log('\n📄 Full response saved to ola-maps-response.json');
      const fs = await import('fs');
      fs.writeFileSync('ola-maps-response.json', JSON.stringify(response.data, null, 2));
      
      break; // Success, no need to try other formats
      
    } catch (error) {
      if (error.response) {
        console.log(`   ❌ Failed: ${error.response.status} - ${error.response.statusText}`);
        console.log(`   Error data:`, error.response.data);
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }

  console.log('\n✨ Test complete!');
};

testOlaMapsDirect().catch(console.error);
