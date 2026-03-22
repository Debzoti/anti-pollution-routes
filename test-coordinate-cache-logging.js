/**
 * Test script to verify coordinate-level cache logging
 * 
 * This script tests two overlapping routes to prove:
 * 1. First route: All coordinates are cache MISS (fetched from APIs)
 * 2. Second route: Overlapping coordinates are cache HIT (reused from cache)
 * 
 * Look for these logs:
 * - "✗ Coordinate cache MISS" = Fetching from API
 * - "✓ Coordinate cache HIT" = Reusing cached data
 */

import axios from 'axios';

const API_URL = 'http://localhost:3000/api/score';

// Test coordinates - Mumbai routes with overlap
const route1 = {
  originLat: 19.0760,
  originLng: 72.8777,
  destLat: 19.1176,
  destLng: 72.9060,
};

const route2 = {
  originLat: 19.0596,
  originLng: 72.8656,
  destLat: 19.1176,
  destLng: 72.9060, // Same destination = overlapping coordinates
};

async function testCoordinateCaching() {
  console.log('='.repeat(80));
  console.log('COORDINATE CACHE LOGGING TEST');
  console.log('='.repeat(80));
  console.log('\nThis test will:');
  console.log('1. Request Route 1 (Mumbai CST → Powai)');
  console.log('2. Request Route 2 (Mumbai BKC → Powai) - overlaps with Route 1');
  console.log('3. Check server logs for cache HIT/MISS indicators\n');
  console.log('Expected behavior:');
  console.log('- Route 1: All coordinates show "✗ Coordinate cache MISS"');
  console.log('- Route 2: Overlapping coordinates show "✓ Coordinate cache HIT"\n');
  console.log('='.repeat(80));

  try {
    // Test Route 1
    console.log('\n📍 Testing Route 1: Mumbai CST → Powai');
    console.log('   (All coordinates should be cache MISS)\n');
    
    const start1 = Date.now();
    const response1 = await axios.post(API_URL, route1);
    const time1 = Date.now() - start1;
    
    console.log(`✓ Route 1 completed in ${time1}ms`);
    console.log(`  Routes returned: ${response1.data.count}`);
    console.log(`  Best route PES: ${response1.data.routes[0].pes.toFixed(2)}`);

    // Wait 2 seconds before second request
    console.log('\n⏳ Waiting 2 seconds before Route 2...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test Route 2 (overlapping)
    console.log('📍 Testing Route 2: Mumbai BKC → Powai');
    console.log('   (Overlapping coordinates should be cache HIT)\n');
    
    const start2 = Date.now();
    const response2 = await axios.post(API_URL, route2);
    const time2 = Date.now() - start2;
    
    console.log(`✓ Route 2 completed in ${time2}ms`);
    console.log(`  Routes returned: ${response2.data.count}`);
    console.log(`  Best route PES: ${response2.data.routes[0].pes.toFixed(2)}`);

    // Compare times
    console.log('\n' + '='.repeat(80));
    console.log('RESULTS:');
    console.log('='.repeat(80));
    console.log(`Route 1 time: ${time1}ms (all cache MISS)`);
    console.log(`Route 2 time: ${time2}ms (some cache HIT)`);
    
    if (time2 < time1) {
      const improvement = ((time1 - time2) / time1 * 100).toFixed(1);
      console.log(`\n✓ Route 2 was ${improvement}% faster due to coordinate caching!`);
    } else {
      console.log(`\n⚠ Route 2 was not faster - check server logs for cache HIT indicators`);
    }
    
    console.log('\n📋 CHECK SERVER LOGS for:');
    console.log('   - "✗ Coordinate cache MISS" = Fetching from API');
    console.log('   - "✓ Coordinate cache HIT" = Reusing cached data');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testCoordinateCaching();
