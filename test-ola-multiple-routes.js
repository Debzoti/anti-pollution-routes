import axios from 'axios';

const API_URL = 'http://localhost:3000/api/score';

// Test with Mumbai - typically has more route alternatives
const testRoute = {
  originLat: 19.0330,
  originLng: 72.8479,
  destLat: 19.1197,
  destLng: 72.9089
};

console.log('🧪 Testing Ola Maps Multiple Routes\n');
console.log('Route: Mumbai Fort → Powai (long distance)');
console.log('Coordinates:', JSON.stringify(testRoute, null, 2));
console.log('\nLonger routes typically have more alternatives');
console.log('='.repeat(60));

async function testMultipleRoutes() {
  try {
    const startTime = Date.now();
    const response = await axios.post(API_URL, testRoute, {
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' }
    });
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ Success in ${duration}ms`);
    console.log(`\n📊 Routes returned: ${response.data.length}`);
    
    response.data.forEach((route, idx) => {
      console.log(`\nRoute ${idx + 1}:`);
      console.log(`  - Route ID: ${route.routeId}`);
      console.log(`  - PES Score: ${route.pes}`);
      console.log(`  - Polyline points: ${route.polyline?.length || 0}`);
      console.log(`  - Distance: ${route.distanceText || 'N/A'}`);
      console.log(`  - Duration: ${route.durationText || 'N/A'}`);
    });
    
    console.log('\n' + '='.repeat(60));
    
    if (response.data.length === 1) {
      console.log('ℹ️  Only 1 route returned');
      console.log('   Ola Maps may not have alternatives for this route');
      console.log('   This is normal - not all routes have alternatives');
    } else if (response.data.length > 1) {
      console.log(`✅ Multiple routes returned (${response.data.length})`);
      console.log('   Ola Maps alternatives are working!');
    }
    
  } catch (error) {
    console.log(`\n❌ Failed: ${error.message}`);
    if (error.response) {
      console.log('Response:', error.response.data);
    }
  }
}

testMultipleRoutes();
