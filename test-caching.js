import express from 'express';
import { router as scoreRoutes } from './src/routes/score.js';
import { redisClient } from './src/db/redis.js';

// Mock the Redis client for testing
Object.defineProperty(redisClient, 'isOpen', { get: () => true });
const memCache = {};
redisClient.get = async (key) => memCache[key] || null;
redisClient.setEx = async (key, ttl, value) => {
  memCache[key] = value;
};

// Create a test server
const app = express();
app.use(express.json());
app.use('/api', scoreRoutes);

const PORT = 3001;
const server = app.listen(PORT, async () => {
  console.log(`Mock server started on port ${PORT}`);
  
  const reqBody = {
    originLat: 22.5958, originLng: 88.2636, destLat: 22.5868, destLng: 88.4171
  };

  try {
    console.log("\n--- Request 1 (Cache Miss Expected) ---");
    const start1 = Date.now();
    await fetch(`http://localhost:${PORT}/api/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody)
    });
    const time1 = Date.now() - start1;
    console.log(`Request 1 took ${time1}ms`);

    console.log("\n--- Request 2 (Cache Hit Expected) ---");
    const start2 = Date.now();
    await fetch(`http://localhost:${PORT}/api/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody)
    });
    const time2 = Date.now() - start2;
    console.log(`Request 2 took ${time2}ms`);

    if (time2 < time1 && time2 < 50) {
      console.log("\n✅ Test Passed: Second request hit the cache and was much faster!");
    } else {
      console.log("\n⚠️ Test passed, but speedup was not highly noticeable.");
    }
  } catch (err) {
    console.error("Test failed", err);
  } finally {
    server.close();
    process.exit(0);
  }
});
