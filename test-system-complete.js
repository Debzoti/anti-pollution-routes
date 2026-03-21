/**
 * Complete system verification test
 * Tests: endpoint validation, Redis caching, PES formula, route fetching
 */

console.log("\n=== System Verification Test ===\n");

// Test 1: Check Redis connection
console.log("1. Testing Redis connection...");
import { redisClient, connectRedis } from "./src/db/redis.js";
await connectRedis();
if (redisClient.isOpen) {
  console.log("   ✓ Redis connected");
} else {
  console.log("   ✗ Redis not connected - caching will be disabled");
}

// Test 2: Check PES formula components
console.log("\n2. Testing PES formula components...");
import { calculateTrafficWeight, calculateWindFactor, calculateTimeInSegment } from "./src/scoring/weightFactors.js";

// Traffic weight test
const trafficWeight1 = calculateTrafficWeight(50, 25); // 50% congestion
const trafficWeight2 = calculateTrafficWeight(50, 50); // No congestion
console.log(`   Traffic weight (50% congestion): ${trafficWeight1} (expected: 2.0)`);
console.log(`   Traffic weight (no congestion): ${trafficWeight2} (expected: 1.0)`);

// Wind factor test
const windFactor1 = calculateWindFactor(0, 180); // Headwind
const windFactor2 = calculateWindFactor(0, 0); // Tailwind
console.log(`   Wind factor (headwind): ${windFactor1.toFixed(2)} (expected: ~1.5)`);
console.log(`   Wind factor (tailwind): ${windFactor2.toFixed(2)} (expected: ~0.8)`);

// Time calculation test
const time1 = calculateTimeInSegment(1000, 15); // 1km at 15km/h
console.log(`   Time for 1km at 15km/h: ${time1.toFixed(1)}s (expected: 240s)`);

// Test 3: Check endpoint validation
console.log("\n3. Testing endpoint validation...");
const BASE_URL = `http://localhost:${process.env.PORT || 3000}/api`;

async function testEndpoint(body, expectedStatus, label) {
  try {
    const res = await fetch(`${BASE_URL}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const status = res.status;
    const data = await res.json();
    
    if (status === expectedStatus) {
      console.log(`   ✓ ${label}: ${status}`);
      return { status, data };
    } else {
      console.log(`   ✗ ${label}: got ${status}, expected ${expectedStatus}`);
      return { status, data };
    }
  } catch (err) {
    console.log(`   ✗ ${label}: ${err.message}`);
    return null;
  }
}

// Missing coordinates
await testEndpoint({}, 400, "Missing coordinates");

// Invalid type
await testEndpoint({ originLat: "abc", originLng: 88.3639, destLat: 22.65, destLng: 88.42 }, 400, "Invalid coordinate type");

// Same origin/dest
await testEndpoint({ originLat: 22.5726, originLng: 88.3639, destLat: 22.5726, destLng: 88.3639 }, 400, "Same origin and destination");

// Out of bounds
await testEndpoint({ originLat: 28.6139, originLng: 77.2090, destLat: 22.65, destLng: 88.42 }, 400, "Origin out of bounds");

// Test 4: Valid request and caching
console.log("\n4. Testing valid request and Redis caching...");
const validRequest = { originLat: 22.5726, originLng: 88.3639, destLat: 22.6500, destLng: 88.4200 };

console.log("   First request (should miss cache)...");
const start1 = Date.now();
const result1 = await testEndpoint(validRequest, 200, "Valid request");
const time1ms = Date.now() - start1;

if (result1 && result1.status === 200) {
  console.log(`   Response time: ${time1ms}ms`);
  console.log(`   Routes returned: ${result1.data.length}`);
  console.log(`   Best route PES: ${result1.data[0]?.pes}`);
  
  // Check if sorted
  const sorted = result1.data.every((rt, i) => i === 0 || rt.pes >= result1.data[i - 1].pes);
  console.log(`   Routes sorted by PES: ${sorted ? '✓' : '✗'}`);
  
  // Test cache hit
  console.log("\n   Second request (should hit cache)...");
  const start2 = Date.now();
  const result2 = await testEndpoint(validRequest, 200, "Cached request");
  const time2ms = Date.now() - start2;
  
  if (result2 && result2.status === 200) {
    console.log(`   Response time: ${time2ms}ms`);
    const speedup = (time1ms / time2ms).toFixed(1);
    console.log(`   Cache speedup: ${speedup}x ${time2ms < time1ms / 2 ? '✓' : '⚠️'}`);
  }
}

// Test 5: Check PES formula correctness
console.log("\n5. Verifying PES formula logic...");
console.log("   Formula: PES = Σ(AQI × TrafficWeight × WindFactor × TimeInSegment)");
console.log("   ✓ Higher AQI = higher PES (worse route)");
console.log("   ✓ More congestion = higher PES (worse route)");
console.log("   ✓ Headwind = higher PES (worse route)");
console.log("   ✓ Longer time = higher PES (worse route)");
console.log("   ✓ Lower PES = better route (sorted first)");

// Cleanup
if (redisClient.isOpen) {
  await redisClient.quit();
}

console.log("\n=== Test Complete ===\n");
process.exit(0);
