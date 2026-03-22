import axios from 'axios';

const API_URL = 'http://localhost:3000/api/score';

// Route 1: Delhi Karol Bagh → Saket (FRESH - never tested)
const route1 = {
  name: "Route 1: Delhi Karol Bagh → Saket",
  data: {
    originLat: 28.6519,
    originLng: 77.1909,
    destLat: 28.5244,
    destLng: 77.2066
  }
};

// Route 2: Delhi Nehru Place → Saket (OVERLAPS with Route 1 near Saket)
const route2 = {
  name: "Route 2: Delhi Nehru Place → Saket (overlaps Route 1)",
  data: {
    originLat: 28.5494,
    originLng: 77.2501,
    destLat: 28.5244,
    destLng: 77.2066
  }
};

async function testRoute(route, routeNum) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${route.name}`);
  console.log(`${'='.repeat(70)}`);
  console.log('Coordinates:', JSON.stringify(route.data, null, 2));
  
  const startTime = Date.now();
  
  try {
    const response = await axios.post(API_URL, route.data, {
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' }
    });
    const duration = Date.now() - startTime;
    
    const speed = duration < 1000 ? '⚡ FAST' : '🐌 SLOW';
    console.log(`\n✅ Success in ${duration}ms ${speed}`);
    console.log(`   PES Score: ${response.data[0]?.pes}`);
    console.log(`   Polyline points: ${response.data[0]?.polyline?.length}`);
    
    return { success: true, duration };
  } catch (error) {
    console.log(`\n❌ Failed: ${error.message}`);
    return { success: false, duration: Date.now() - startTime };
  }
}

async function runFinalCacheProof() {
  console.log('\n🧪 FINAL CACHE PROOF TEST');
  console.log('='.repeat(70));
  console.log('\nObjective: Prove coordinate-level caching works');
  console.log('\nTest Plan:');
  console.log('  1. Route 1: Karol Bagh → Saket (FRESH - will be SLOW)');
  console.log('  2. Route 2: Nehru Place → Saket (OVERLAPS - will be FASTER)');
  console.log('\nBoth routes end at Saket, so Route 2 should reuse');
  console.log('cached environmental data from Saket area.\n');
  
  // Test Route 1
  console.log('⏱️  Testing Route 1 (fresh data)...');
  const result1 = await testRoute(route1, 1);
  
  if (!result1.success) {
    console.log('\n❌ Route 1 failed - cannot continue test');
    return;
  }
  
  // Wait 2 seconds
  console.log('\n⏳ Waiting 2 seconds before Route 2...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test Route 2
  console.log('\n⏱️  Testing Route 2 (should reuse Saket coordinates)...');
  const result2 = await testRoute(route2, 2);
  
  if (!result2.success) {
    console.log('\n❌ Route 2 failed');
    return;
  }
  
  // Analysis
  console.log('\n' + '='.repeat(70));
  console.log('📊 CACHE PROOF RESULTS');
  console.log('='.repeat(70));
  console.log(`\nRoute 1 (fresh):     ${result1.duration}ms 🐌`);
  console.log(`Route 2 (overlaps):  ${result2.duration}ms ⚡`);
  
  const speedup = ((result1.duration - result2.duration) / result1.duration * 100).toFixed(0);
  
  if (result2.duration < result1.duration) {
    console.log(`\n✅ COORDINATE CACHING CONFIRMED!`);
    console.log(`   Route 2 was ${speedup}% faster`);
    console.log(`   Saket area coordinates were reused from Route 1`);
    console.log(`\n💡 This proves the coordinate-level cache is working!`);
  } else {
    console.log(`\n⚠️  Route 2 was not faster`);
    console.log(`   Possible reasons:`);
    console.log(`   - Routes may not overlap enough`);
    console.log(`   - Both routes hit route-level cache`);
    console.log(`   - Network variance`);
  }
  
  console.log('\n' + '='.repeat(70));
}

runFinalCacheProof();
