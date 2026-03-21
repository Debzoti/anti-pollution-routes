/**
 * Test validation middleware
 * Ensures all validation rules work correctly
 */

const BASE_URL = `http://localhost:${process.env.PORT || 3000}/api`;

console.log("\n=== Validation Middleware Tests ===\n");

let passed = 0;
let failed = 0;

async function testEndpoint(body, expectedStatus, testName) {
  try {
    const res = await fetch(`${BASE_URL}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await res.json();
    
    if (res.status === expectedStatus) {
      console.log(`✅ ${testName}`);
      console.log(`   Status: ${res.status}, Error: ${data.error || 'N/A'}`);
      passed++;
    } else {
      console.log(`❌ ${testName}`);
      console.log(`   Expected: ${expectedStatus}, Got: ${res.status}`);
      console.log(`   Response: ${JSON.stringify(data)}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ${testName}`);
    console.log(`   Error: ${err.message}`);
    failed++;
  }
}

async function runTests() {
  // Valid request (should pass)
  console.log("1. Valid Request Tests\n");
  await testEndpoint({
    originLat: 22.5726,
    originLng: 88.3639,
    destLat: 22.6500,
    destLng: 88.4200
  }, 200, "Valid Kolkata route");

  // Missing fields
  console.log("\n2. Missing Fields Tests\n");
  await testEndpoint({}, 400, "All fields missing");
  await testEndpoint({
    originLat: 22.5726,
    originLng: 88.3639
  }, 400, "Destination missing");
  await testEndpoint({
    destLat: 22.6500,
    destLng: 88.4200
  }, 400, "Origin missing");

  // Invalid types
  console.log("\n3. Type Validation Tests\n");
  await testEndpoint({
    originLat: "abc",
    originLng: 88.3639,
    destLat: 22.6500,
    destLng: 88.4200
  }, 400, "String instead of number");
  await testEndpoint({
    originLat: NaN,
    originLng: 88.3639,
    destLat: 22.6500,
    destLng: 88.4200
  }, 400, "NaN value");
  await testEndpoint({
    originLat: null,
    originLng: 88.3639,
    destLat: 22.6500,
    destLng: 88.4200
  }, 400, "Null value");

  // Same origin and destination
  console.log("\n4. Same Origin/Destination Test\n");
  await testEndpoint({
    originLat: 22.5726,
    originLng: 88.3639,
    destLat: 22.5726,
    destLng: 88.3639
  }, 400, "Identical origin and destination");

  // Out of bounds
  console.log("\n5. Bounding Box Tests\n");
  await testEndpoint({
    originLat: 28.6139, // Delhi
    originLng: 77.2090,
    destLat: 22.6500,
    destLng: 88.4200
  }, 400, "Origin outside Kolkata (Delhi)");
  await testEndpoint({
    originLat: 22.5726,
    originLng: 88.3639,
    destLat: 19.0760, // Mumbai
    destLng: 72.8777
  }, 400, "Destination outside Kolkata (Mumbai)");
  await testEndpoint({
    originLat: 22.4, // Just outside southern bound
    originLng: 88.3639,
    destLat: 22.6500,
    destLng: 88.4200
  }, 400, "Origin just outside southern bound");
  await testEndpoint({
    originLat: 22.5726,
    originLng: 88.3639,
    destLat: 23.0, // Just outside northern bound
    destLng: 88.4200
  }, 400, "Destination just outside northern bound");

  // Edge cases
  console.log("\n6. Edge Case Tests\n");
  await testEndpoint({
    originLat: 22.5, // Exactly on boundary
    originLng: 88.2,
    destLat: 22.9,
    destLng: 88.6
  }, 200, "Coordinates exactly on boundaries");

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(50) + "\n");

  if (failed === 0) {
    console.log("🎉 All validation tests passed!\n");
  } else {
    console.log("⚠️  Some validation tests failed\n");
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error("\n❌ Test suite failed:", err.message);
  process.exit(1);
});
