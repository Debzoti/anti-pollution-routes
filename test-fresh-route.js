import axios from 'axios';

const API_URL = 'http://localhost:3000/api/score';

// Fresh coordinates not in cache
const testRoute = {
  name: "Mumbai Andheri to Powai (Fresh)",
  data: {
    originLat: 19.1136,
    originLng: 72.8697,
    destLat: 19.1176,
    destLng: 72.9060
  }
};

async function testFreshRoute() {
  console.log(`Testing: ${testRoute.name}`);
  console.log('Request:', JSON.stringify(testRoute.data, null, 2));
  console.log('='.repeat(60));
  
  try {
    const startTime = Date.now();
    const response = await axios.post(API_URL, testRoute.data, {
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' }
    });
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ Success (${duration}ms)`);
    console.log(`Routes returned: ${response.data.length}`);
    
    response.data.forEach((route, idx) => {
      console.log(`\nRoute ${idx + 1}:`);
      console.log(`  - Route ID: ${route.routeId}`);
      console.log(`  - PES Score: ${route.pes}`);
      console.log(`  - Polyline points: ${route.polyline?.length || 0}`);
    });
    
  } catch (error) {
    console.log(`\n❌ Failed`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Error:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }
}

testFreshRoute();
