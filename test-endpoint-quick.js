import axios from 'axios';

const API_URL = 'http://localhost:3000/api/score';

// Test coordinates from Mumbai
const testCases = [
  {
    name: "Mumbai CST to Bandra",
    data: {
      originLat: 19.0760,
      originLng: 72.8777,
      destLat: 19.0850,
      destLng: 72.8950
    }
  },
  {
    name: "Delhi Dwarka to Rajiv Chowk",
    data: {
      originLat: 28.5921,
      originLng: 77.0460,
      destLat: 28.6328,
      destLng: 77.2197
    }
  },
  {
    name: "Delhi Rohini to Lajpat Nagar",
    data: {
      originLat: 28.7495,
      originLng: 77.0736,
      destLat: 28.5678,
      destLng: 77.2432
    }
  }
];

async function testEndpoint(testCase) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${testCase.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log('Request:', JSON.stringify(testCase.data, null, 2));
  
  try {
    const startTime = Date.now();
    const response = await axios.post(API_URL, testCase.data, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });
    const duration = Date.now() - startTime;
    
    console.log(`✅ Success (${duration}ms)`);
    console.log(`Routes returned: ${response.data.length}`);
    
    response.data.forEach((route, idx) => {
      console.log(`\nRoute ${idx + 1}:`);
      console.log(`  - Route ID: ${route.routeId}`);
      console.log(`  - PES Score: ${route.pes}`);
      console.log(`  - Polyline points: ${route.polyline?.length || 0}`);
    });
    
    return { success: true, duration };
  } catch (error) {
    console.log(`❌ Failed`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Error:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('No response received - is the server running?');
    } else {
      console.log('Error:', error.message);
    }
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting endpoint tests...');
  console.log(`Target: ${API_URL}\n`);
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testEndpoint(testCase);
    results.push({ name: testCase.name, ...result });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between tests
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}`);
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const time = result.duration ? `(${result.duration}ms)` : '';
    console.log(`${status} ${result.name} ${time}`);
  });
  
  const passed = results.filter(r => r.success).length;
  console.log(`\nTotal: ${passed}/${results.length} passed`);
}

runTests().catch(console.error);
