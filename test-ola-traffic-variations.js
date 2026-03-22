import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OLA_API_KEY = process.env.OLA_MAPS_API_KEY;
const testLat = 19.076;
const testLng = 72.8777;

async function testVariation(name, params) {
  console.log(`\n🔍 Testing: ${name}`);
  console.log('Parameters:', params);
  console.log('─'.repeat(50));
  
  try {
    const queryParams = new URLSearchParams({
      ...params,
      api_key: OLA_API_KEY,
    });

    const response = await axios.post(
      `https://api.olamaps.io/routing/v1/directions?${queryParams.toString()}`,
      null,
      {
        headers: { 'X-Request-Id': `test-${Date.now()}` },
        timeout: 10000,
      }
    );

    const route = response.data.routes?.[0];
    const leg = route?.legs?.[0];
    
    console.log('✅ Success!');
    console.log(`Duration: ${leg?.duration || 'N/A'} seconds`);
    console.log(`Duration in traffic: ${leg?.duration_in_traffic || 'N/A'}`);
    console.log(`Traffic speed factor: ${leg?.traffic_speed_factor || 'N/A'}`);
    console.log(`Traffic delay: ${leg?.traffic_delay || 'N/A'}`);
    
    // Check for any traffic-related fields
    const allKeys = Object.keys(leg || {});
    const trafficKeys = allKeys.filter(k => k.toLowerCase().includes('traffic'));
    if (trafficKeys.length > 0) {
      console.log('\n📊 Traffic-related fields found:');
      trafficKeys.forEach(key => {
        console.log(`  ${key}: ${leg[key]}`);
      });
    } else {
      console.log('\n❌ No traffic-related fields found in response');
    }
    
  } catch (error) {
    console.log(`❌ Failed: ${error.response?.status || error.message}`);
  }
}

async function runTests() {
  console.log('═'.repeat(50));
  console.log('  OLA MAPS TRAFFIC METADATA TESTS');
  console.log('═'.repeat(50));

  // Test 1: traffic_metadata=true
  await testVariation('traffic_metadata=true', {
    origin: `${testLat},${testLng}`,
    destination: '19.0850,72.8950',
    alternatives: 'false',
    traffic_metadata: 'true',
  });

  // Test 2: with_traffic=true
  await testVariation('with_traffic=true', {
    origin: `${testLat},${testLng}`,
    destination: '19.0850,72.8950',
    alternatives: 'false',
    with_traffic: 'true',
  });

  // Test 3: traffic=true
  await testVariation('traffic=true', {
    origin: `${testLat},${testLng}`,
    destination: '19.0850,72.8950',
    alternatives: 'false',
    traffic: 'true',
  });

  // Test 4: departure_time=now
  await testVariation('departure_time=now', {
    origin: `${testLat},${testLng}`,
    destination: '19.0850,72.8950',
    alternatives: 'false',
    departure_time: 'now',
  });

  // Test 5: departure_time with timestamp
  const nowTimestamp = Math.floor(Date.now() / 1000);
  await testVariation(`departure_time=${nowTimestamp}`, {
    origin: `${testLat},${testLng}`,
    destination: '19.0850,72.8950',
    alternatives: 'false',
    departure_time: nowTimestamp.toString(),
  });

  // Test 6: traffic_model
  await testVariation('traffic_model=best_guess', {
    origin: `${testLat},${testLng}`,
    destination: '19.0850,72.8950',
    alternatives: 'false',
    traffic_model: 'best_guess',
  });

  console.log('\n' + '═'.repeat(50));
  console.log('  TESTS COMPLETE');
  console.log('═'.repeat(50));
}

runTests().catch(console.error);
