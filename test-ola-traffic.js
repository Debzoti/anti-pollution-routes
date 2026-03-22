import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OLA_API_KEY = process.env.OLA_MAPS_API_KEY;

// Test coordinates (Mumbai CST)
const testLat = 19.076;
const testLng = 72.8777;

console.log('🔍 Testing Ola Maps Traffic API...\n');

// Test 1: Check if Ola Maps has a traffic endpoint
async function testOlaTraffic() {
  console.log('Test 1: Ola Maps Traffic Flow API');
  console.log('=====================================\n');

  try {
    // Try the traffic flow endpoint (similar to TomTom)
    const response = await axios.get(
      `https://api.olamaps.io/traffic/v1/flow`,
      {
        params: {
          point: `${testLat},${testLng}`,
          api_key: OLA_API_KEY,
        },
        timeout: 10000,
      }
    );

    console.log('✅ Success! Response:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.log(`❌ Failed with status ${error.response.status}`);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

// Test 2: Check traffic data in directions API
async function testDirectionsTraffic() {
  console.log('\n\nTest 2: Traffic Data in Directions API');
  console.log('=====================================\n');

  try {
    const params = new URLSearchParams({
      origin: `${testLat},${testLng}`,
      destination: '19.0850,72.8950',
      alternatives: 'false',
      traffic_metadata: 'true', // Enable traffic metadata
      api_key: OLA_API_KEY,
    });

    const response = await axios.post(
      `https://api.olamaps.io/routing/v1/directions?${params.toString()}`,
      null,
      {
        headers: { 'X-Request-Id': `traffic-test-${Date.now()}` },
        timeout: 10000,
      }
    );

    console.log('✅ Success! Checking for traffic data...\n');
    
    console.log('Full API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    const route = response.data.routes?.[0];
    if (route) {
      console.log('Route Summary:');
      console.log(`  Duration: ${route.legs?.[0]?.duration || 'N/A'} seconds`);
      console.log(`  Duration in traffic: ${route.legs?.[0]?.duration_in_traffic || 'N/A'} seconds`);
      console.log(`  Distance: ${route.legs?.[0]?.readable_distance || 'N/A'}`);
      
      // Check if there's traffic info in steps
      const steps = route.legs?.[0]?.steps || [];
      console.log(`\n  Total steps: ${steps.length}`);
      
      if (steps.length > 0) {
        console.log('\n  First step details:');
        console.log(JSON.stringify(steps[0], null, 2));
      }
    }
  } catch (error) {
    if (error.response) {
      console.log(`❌ Failed with status ${error.response.status}`);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

// Test 3: Check Ola Maps documentation endpoints
async function testOlaEndpoints() {
  console.log('\n\nTest 3: Testing Various Ola Maps Endpoints');
  console.log('=====================================\n');

  const endpoints = [
    { name: 'Traffic Flow', url: 'https://api.olamaps.io/traffic/v1/flow' },
    { name: 'Traffic Incidents', url: 'https://api.olamaps.io/traffic/v1/incidents' },
    { name: 'Traffic Tiles', url: 'https://api.olamaps.io/traffic/v1/tiles' },
  ];

  for (const endpoint of endpoints) {
    console.log(`\nTesting: ${endpoint.name}`);
    console.log(`URL: ${endpoint.url}`);
    
    try {
      const response = await axios.get(endpoint.url, {
        params: {
          point: `${testLat},${testLng}`,
          api_key: OLA_API_KEY,
        },
        timeout: 5000,
      });
      
      console.log(`✅ ${endpoint.name}: Available`);
      console.log('Sample response:', JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${endpoint.name}: Status ${error.response.status}`);
      } else {
        console.log(`❌ ${endpoint.name}: ${error.message}`);
      }
    }
  }
}

// Run all tests
async function runTests() {
  await testOlaTraffic();
  await testDirectionsTraffic();
  await testOlaEndpoints();
  
  console.log('\n\n=====================================');
  console.log('📊 Summary');
  console.log('=====================================');
  console.log('\nOla Maps may not have a dedicated traffic API like TomTom.');
  console.log('However, the Directions API includes duration_in_traffic data.');
  console.log('\nRecommendation:');
  console.log('  - Use duration_in_traffic from Directions API');
  console.log('  - Calculate traffic factor: duration_in_traffic / duration');
  console.log('  - This gives real-time traffic conditions for routes');
}

runTests().catch(console.error);
