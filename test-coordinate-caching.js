import axios from 'axios';

const API_URL = 'http://localhost:3000/api/score';

// Test overlapping routes to demonstrate coordinate-level caching
const tests = [
  {
    name: "Route 1: Mumbai CST → Dadar",
    data: {
      originLat: 19.076,
      originLng: 72.8777,
      destLat: 19.0176,
      destLng: 72.8561
    }
  },
  {
    name: "Route 2: Mumbai CST → Kurla (overlaps with Route 1 near CST)",
    data: {
      originLat: 19.076,
      originLng: 72.8777,
      destLat: 19.0728,
      destLng: 72.8826
    }
  },
  {
    name: "Route 3: Mumbai Worli → Dadar (overlaps with Route 1 near Dadar)",
    data: {
      originLat: 19.0144,
      originLng: 72.8180,
      destLat: 19.0176,
      destLng: 72.8561
    }
  }
];

async function testRoute(test, index) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Test ${index + 1}: ${test.name}`);
  console.log(`${'='.repeat(70)}`);
  
  try {
    const startTime = Date.now();
    const response = await axios.post(API_URL, test.data, {
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' }
    });
    const duration = Date.now() - startTime;
    
    console.log(`✅ Success in ${duration}ms`);
    console.log(`   Routes: ${response.data.length}, PES: ${response.data[0]?.pes}`);
    
    return { success: true, duration };
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return { success: false, duration: 0 };
  }
}

async function runTests() {
  console.log('\n🧪 Testing Coordinate-Level Caching with Overlapping Routes\n');
  console.log('Expected behavior:');
  console.log('  - Route 1: Slow (fetches fresh data for all coordinates)');
  console.log('  - Route 2: Faster (reuses CST coordinate data from Route 1)');
  console.log('  - Route 3: Faster (reuses Dadar coordinate data from Route 1)');
  
  const results = [];
  
  for (let i = 0; i < tests.length; i++) {
    const result = await testRoute(tests[i], i);
    results.push(result);
    
    // Wait 1 second between tests
    if (i < tests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(70)}`);
  
  results.forEach((result, i) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} Test ${i + 1}: ${result.duration}ms`);
  });
  
  if (results.every(r => r.success)) {
    console.log('\n✅ All tests passed!');
    console.log('\nCaching analysis:');
    console.log(`  Route 1 (baseline): ${results[0].duration}ms`);
    console.log(`  Route 2 (with cache): ${results[1].duration}ms (${((1 - results[1].duration / results[0].duration) * 100).toFixed(0)}% faster)`);
    console.log(`  Route 3 (with cache): ${results[2].duration}ms (${((1 - results[2].duration / results[0].duration) * 100).toFixed(0)}% faster)`);
  }
}

runTests();
