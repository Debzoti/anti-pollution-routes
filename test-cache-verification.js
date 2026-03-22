import axios from 'axios';

const API_URL = 'http://localhost:3000/api/score';

// Same route for all 10 requests
const testRoute = {
  originLat: 19.076,
  originLng: 72.8777,
  destLat: 19.085,
  destLng: 72.895
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

async function runCacheTest() {
  console.log('🧪 Cache Verification Test - Same Route 10 Times\n');
  console.log('Route:', JSON.stringify(testRoute, null, 2));
  console.log('\nExpected behavior:');
  console.log('  - Request 1: Slow (7-14 seconds) - fetches from APIs or coordinates');
  console.log('  - Requests 2-10: Fast (<200ms) - served from route cache\n');
  console.log('='.repeat(70));
  
  const results = [];
  
  for (let i = 1; i <= 10; i++) {
    process.stdout.write(`Request ${i}/10... `);
    
    const result = await testRequest(i);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${result.duration}ms (PES: ${result.pes})`);
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
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  
  console.log(`Total Requests: ${results.length}`);
  console.log(`Successful: ${successfulResults.length}`);
  console.log(`Failed: ${results.length - successfulResults.length}\n`);
  
  console.log('Response Times:');
  console.log(`  First request: ${durations[0]}ms`);
  console.log(`  Average (all): ${avgDuration.toFixed(0)}ms`);
  console.log(`  Average (2-10): ${(durations.slice(1).reduce((a, b) => a + b, 0) / (durations.length - 1)).toFixed(0)}ms`);
  console.log(`  Fastest: ${minDuration}ms`);
  console.log(`  Slowest: ${maxDuration}ms\n`);
  
  // Cache effectiveness analysis
  const cacheThreshold = 500; // If response < 500ms, likely from cache
  const cachedRequests = durations.filter(d => d < cacheThreshold).length;
  const cacheHitRate = (cachedRequests / durations.length * 100).toFixed(0);
  
  console.log('Cache Analysis:');
  console.log(`  Requests < ${cacheThreshold}ms (likely cached): ${cachedRequests}/${durations.length}`);
  console.log(`  Cache hit rate: ${cacheHitRate}%\n`);
  
  if (durations[0] > cacheThreshold && durations.slice(1).every(d => d < cacheThreshold)) {
    console.log('✅ CACHE IS WORKING PERFECTLY!');
    console.log('   First request was slow (fetching data)');
    console.log('   Subsequent requests were fast (served from cache)');
  } else if (durations.every(d => d < cacheThreshold)) {
    console.log('✅ ALL REQUESTS SERVED FROM CACHE!');
    console.log('   Route was already cached from previous test');
  } else if (durations.every(d => d > cacheThreshold)) {
    console.log('⚠️  CACHE MAY NOT BE WORKING!');
    console.log('   All requests are slow - cache might be disabled or not working');
  } else {
    console.log('⚠️  MIXED RESULTS');
    console.log('   Some requests fast, some slow - investigate further');
  }
  
  console.log('\nDetailed timing breakdown:');
  durations.forEach((duration, i) => {
    const cached = duration < cacheThreshold ? '(cached)' : '(fresh)';
    console.log(`  Request ${i + 1}: ${duration}ms ${cached}`);
  });
}

runCacheTest();
