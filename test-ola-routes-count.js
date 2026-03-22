import axios from 'axios';

const API_URL = 'http://localhost:3000/api/score';

// Test with Kolkata coordinates
const testRoute = {
  originLat: 22.5320,
  originLng: 88.3647,
  destLat: 22.5868,
  destLng: 88.4742
};

console.log('🧪 Testing Ola Maps Route Count\n');
console.log('Route: Kolkata Ballygunge → New Town');
console.log('Coordinates:', JSON.stringify(testRoute, null, 2));
console.log('\nExpected: Ola Maps should return 1-3 alternative routes');
console.log('='.repeat(60));

async function testRouteCount() {
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
    });
    
    console.log('\n' + '='.repeat(60));
    
    if (response.data.length === 1) {
      console.log('⚠️  Only 1 route returned');
      console.log('   Check server logs for Ola Maps API response');
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

testRouteCount();
