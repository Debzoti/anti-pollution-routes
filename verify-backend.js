/**
 * Backend Verification Script
 * Tests all backend functionality without frontend
 */

console.log("\n=== Backend Verification ===\n");

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

let passed = 0;
let failed = 0;

function log(status, message) {
  console.log(`${status ? '✅' : '❌'} ${message}`);
  status ? passed++ : failed++;
}

async function verify() {
  // 1. Health Check
  console.log("1. Health Check");
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    log(data.status === 'healthy', `Server health: ${data.status}`);
    log(data.database === 'connected', `Database: ${data.database}`);
  } catch (err) {
    log(false, `Health check failed: ${err.message}`);
  }

  // 2. Score Endpoint
  console.log("\n2. Score Endpoint");
  try {
    const res = await fetch(`${BASE_URL}/api/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originLat: 22.5726,
        originLng: 88.3639,
        destLat: 22.6500,
        destLng: 88.4200
      })
    });
    
    if (res.ok) {
      const routes = await res.json();
      log(Array.isArray(routes), `Returns array: ${Array.isArray(routes)}`);
      log(routes.length > 0, `Routes returned: ${routes.length}`);
      log(routes[0].pes != null, `PES score present: ${routes[0]?.pes}`);
      log(routes[0].routeId != null, `Route ID present: ${routes[0]?.routeId}`);
      
      // Check sorting
      const sorted = routes.every((r, i) => i === 0 || r.pes >= routes[i-1].pes);
      log(sorted, `Routes sorted by PES: ${sorted}`);
    } else {
      const error = await res.json();
      log(false, `Score endpoint failed: ${error.error}`);
    }
  } catch (err) {
    log(false, `Score endpoint error: ${err.message}`);
  }

  // 3. Validation Tests
  console.log("\n3. Validation Tests");
  
  // Missing coordinates
  try {
    const res = await fetch(`${BASE_URL}/api/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    log(res.status === 400, `Missing coords validation: ${res.status === 400 ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    log(false, `Validation test error: ${err.message}`);
  }

  // Out of bounds
  try {
    const res = await fetch(`${BASE_URL}/api/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originLat: 28.6139, // Delhi
        originLng: 77.2090,
        destLat: 22.6500,
        destLng: 88.4200
      })
    });
    log(res.status === 400, `Out of bounds validation: ${res.status === 400 ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    log(false, `Validation test error: ${err.message}`);
  }

  // 4. SSE Endpoint
  console.log("\n4. SSE Endpoint");
  try {
    const res = await fetch(`${BASE_URL}/api/updates?originLat=22.5726&originLng=88.3639&destLat=22.6500&destLng=88.4200`);
    log(res.headers.get('content-type') === 'text/event-stream', `SSE endpoint available: ${res.headers.get('content-type')}`);
    res.body.cancel(); // Close the stream
  } catch (err) {
    log(false, `SSE endpoint error: ${err.message}`);
  }

  // 5. Redis Connection
  console.log("\n5. Redis Connection");
  try {
    const { redisClient } = await import('./src/db/redis.js');
    log(redisClient.isOpen, `Redis connected: ${redisClient.isOpen}`);
  } catch (err) {
    log(false, `Redis check error: ${err.message}`);
  }

  // 6. Database Connection
  console.log("\n6. Database Connection");
  try {
    const pool = (await import('./src/db/client.js')).default;
    const result = await pool.query('SELECT COUNT(*) FROM air_quality');
    log(true, `Database query successful: ${result.rows[0].count} AQI records`);
  } catch (err) {
    log(false, `Database error: ${err.message}`);
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(50) + "\n");

  if (failed === 0) {
    console.log("🎉 All backend systems operational!\n");
  } else {
    console.log("⚠️  Some systems need attention\n");
  }

  process.exit(failed > 0 ? 1 : 0);
}

verify().catch(err => {
  console.error("\n❌ Verification failed:", err.message);
  process.exit(1);
});
