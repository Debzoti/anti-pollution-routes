import axios from 'axios';

const API_URL = 'http://localhost:3000/api/score';

// Completely new route that hasn't been tested before
const testRoute = {
  originLat: 19.0596,  // Mumbai BKC
  originLng: 72.8656,
  destLat: 19.1136,    // Mumbai Andheri
  destLng: 72.8697
};

async function testRequest(requestNum) {
  const startTime = Date.now();
  
  try {
    const response = await axios.post(API_URL, testRoute, {
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' }
    });
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      duration,
      pes: response.data[0]?.pes,
      routes: response.data.length
    };
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error.message
    };
  }
}

async function runFreshCacheTest() {
  console.log('🧪 Fresh Cache Test - New Route 10 Times\n');
  console.log('Route: Mumbai BKC → Andheri (FRESH - never tested before)');
  console.log(JSON.stringify(testRoute, null, 2));
  console.log('\nExpected behavior:');
  console.log('  - Request 1: SLOW (7-14 seconds) - fetches from APIs');
  console.log('  - Requests 2-10: FAST (<200ms) - served from route cache\n');
  console.log('='.repeat(70));
  
  const results = [];
  
  for (let i = 1; i <= 10; i++) {
    process.stdout.write(`Request ${i}/10... `);
    
    const result = await testRequest(i);
    results.push(result);
    
    if (result.success) {
      const speed = result.duration < 500 ? '⚡' : '🐌';
      console.log(`✅ ${result.duration}ms ${speed} (PES: ${result.pes})`);
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('='.repeat(70));
  console.log('\nRESULTS ANALYSIS\n');
  
  const successfulResults = results.filter(r => r.success);
  
  if (successfulResults.length === 0) {
    console.log('❌ All requests failed!');
    return;
  }
  
  const durations = successfulResults.map(r => r.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  
  console.log(`Total Requests: ${results.length}`);
  console.log(`Successful: ${successfulResults.length}\n`);
  
  console.log('Response Times:');
  console.log(`  Request 1 (first): ${durations[0]}ms`);
  console.log(`  Request 2-10 (avg): ${(durations.slice(1).reduce((a, b) => a + b, 0) / (durations.length - 1)).toFixed(0)}ms`);
  console.log(`  Overall average: ${avgDuration.toFixed(0)}ms\n`);
  
  // Cache effectiveness analysis
  const cacheThreshold = 500;
  const firstRequestSlow = durations[0] > cacheThreshold;
  const subsequentRequestsFast = durations.slice(1).every(d => d < cacheThreshold);
  
  console.log('Cache Verification:');
  console.log(`  First request: ${durations[0]}ms ${firstRequestSlow ? '(SLOW - fetching)' : '(FAST - already cached?)'}`);
  console.log(`  Requests 2-10: ${subsequentRequestsFast ? 'ALL FAST' : 'SOME SLOW'} ${subsequentRequestsFast ? '(cached ✅)' : '(not cached ❌)'}\n`);
  
  if (firstRequestSlow && subsequentRequestsFast) {
    console.log('✅ CACHE IS WORKING PERFECTLY!');
    console.log(`   First request: ${durations[0]}ms (fetched fresh data)`);
    console.log(`   Subsequent: ${(durations.slice(1).reduce((a, b) => a + b, 0) / (durations.length - 1)).toFixed(0)}ms average (served from cache)`);
    console.log(`   Speed improvement: ${((durations[0] / durations[1]) - 1).toFixed(0)}x faster!`);
  } else if (!firstRequestSlow && subsequentRequestsFast) {
    console.log('✅ ALL REQUESTS FAST (route was already cached)');
  } else {
    console.log('⚠️  CACHE MAY NOT BE WORKING AS EXPECTED');
  }
  
  console.log('\nDetailed timing:');
  durations.forEach((duration, i) => {
    const status = duration < cacheThreshold ? '⚡ FAST (cached)' : '🐌 SLOW (fetching)';
    console.log(`  Request ${i + 1}: ${duration}ms ${status}`);
  });
}

runFreshCacheTest();
