/**
 * Test script to verify new response format
 * 
 * New format returns an object with:
 * {
 *   success: true,
 *   count: 3,
 *   routes: [...]
 * }
 * 
 * Instead of just returning the routes array directly.
 */

import axios from 'axios';

const API_URL = 'http://localhost:3000/api/score';

async function testNewResponseFormat() {
  console.log('='.repeat(80));
  console.log('NEW RESPONSE FORMAT TEST');
  console.log('='.repeat(80));
  console.log('\nTesting that API returns object with success, count, and routes fields\n');

  try {
    // Test with Mumbai coordinates
    const requestBody = {
      originLat: 19.0760,
      originLng: 72.8777,
      destLat: 19.1176,
      destLng: 72.9060,
    };

    console.log('📍 Request: Mumbai CST → Powai');
    console.log('   Body:', JSON.stringify(requestBody, null, 2));
    console.log();

    const response = await axios.post(API_URL, requestBody);
    const data = response.data;

    console.log('✓ Response received\n');

    // Verify response structure
    console.log('Checking response structure...\n');

    // Check if response is an object (not array)
    if (Array.isArray(data)) {
      console.error('❌ FAIL: Response is an array (old format)');
      console.error('   Expected: Object with { success, count, routes }');
      console.error('   Got: Array');
      process.exit(1);
    }
    console.log('✓ Response is an object (not array)');

    // Check for required fields
    if (typeof data.success !== 'boolean') {
      console.error('❌ FAIL: Missing or invalid "success" field');
      process.exit(1);
    }
    console.log(`✓ Has "success" field: ${data.success}`);

    if (typeof data.count !== 'number') {
      console.error('❌ FAIL: Missing or invalid "count" field');
      process.exit(1);
    }
    console.log(`✓ Has "count" field: ${data.count}`);

    if (!Array.isArray(data.routes)) {
      console.error('❌ FAIL: Missing or invalid "routes" field (should be array)');
      process.exit(1);
    }
    console.log(`✓ Has "routes" field (array with ${data.routes.length} items)`);

    // Verify count matches routes length
    if (data.count !== data.routes.length) {
      console.error(`❌ FAIL: count (${data.count}) doesn't match routes.length (${data.routes.length})`);
      process.exit(1);
    }
    console.log(`✓ count matches routes.length`);

    // Verify routes are sorted by PES
    const pesValues = data.routes.map(r => r.pes);
    const isSorted = pesValues.every((val, i, arr) => i === 0 || arr[i - 1] <= val);
    if (!isSorted) {
      console.error('❌ FAIL: Routes are not sorted by PES (ascending)');
      process.exit(1);
    }
    console.log(`✓ Routes are sorted by PES (ascending)`);

    // Display sample response
    console.log('\n' + '='.repeat(80));
    console.log('SAMPLE RESPONSE:');
    console.log('='.repeat(80));
    console.log(JSON.stringify({
      success: data.success,
      count: data.count,
      routes: data.routes.map(r => ({
        routeId: r.routeId,
        pes: r.pes,
        distance: r.distance,
        duration: r.duration,
        distanceText: r.distanceText,
        durationText: r.durationText,
        segmentCount: r.segments?.length || 0,
      }))
    }, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(80));
    console.log('\nNew response format is working correctly!');
    console.log('\nResponse structure:');
    console.log('  - success: boolean (indicates successful response)');
    console.log('  - count: number (number of routes returned)');
    console.log('  - routes: array (sorted by PES, lowest first)');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the test
testNewResponseFormat();
