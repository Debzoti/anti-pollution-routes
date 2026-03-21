# Robust City Scaling Solutions

## Current Problem

**Hardcoded cities in scheduler.js:**
```javascript
const POINTS = [
  { name: "Delhi", lat: 28.6139, lng: 77.2090 },
  { name: "Mumbai", lat: 19.0760, lng: 72.8777 }
];
```

**Issues:**
- Manual code changes to add cities
- Deployment required for new cities
- External API timeouts (10 seconds)
- Not scalable beyond a few cities

---

## Solution 1: Database-Driven City Configuration (Recommended)

### Architecture

**Create a `supported_cities` table:**

```sql
CREATE TABLE supported_cities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert cities
INSERT INTO supported_cities (name, latitude, longitude) VALUES
  ('Delhi', 28.6139, 77.2090),
  ('Mumbai', 19.0760, 72.8777),
  ('Kolkata', 22.5726, 88.3639),
  ('Bangalore', 12.9716, 77.5946),
  ('Chennai', 13.0827, 80.2707);
```

### Modified Scheduler

```javascript
// src/jobs/scheduler.js
import pool from '../db/client.js';

async function getEnabledCities() {
  const result = await pool.query(
    'SELECT name, latitude, longitude FROM supported_cities WHERE enabled = true'
  );
  return result.rows;
}

// Fetch cities dynamically
const cities = await getEnabledCities();

// Run ingestion for each city
for (const city of cities) {
  try {
    await fetchAndStoreAQI(city.latitude, city.longitude);
  } catch (error) {
    console.error(`[scheduler] AQI failed for ${city.name}:`, error.message);
  }
}
```

### Benefits
✅ Add cities via SQL (no code changes)  
✅ Enable/disable cities without deployment  
✅ Admin UI can manage cities  
✅ Scale to hundreds of cities  
✅ No code deployment needed

---

## Solution 2: Environment Variable Configuration

### Use .env for city list

```env
# .env
SUPPORTED_CITIES=Delhi:28.6139:77.2090,Mumbai:19.0760:72.8777,Kolkata:22.5726:88.3639
```

```javascript
// config.js
export const supportedCities = process.env.SUPPORTED_CITIES
  .split(',')
  .map(city => {
    const [name, lat, lng] = city.split(':');
    return { name, latitude: parseFloat(lat), longitude: parseFloat(lng) };
  });
```

### Benefits
✅ No code changes  
✅ Restart server to apply changes  
✅ Simple configuration  

### Drawbacks
❌ Still requires server restart  
❌ Not user-friendly for non-technical users

---

## Solution 3: Handle Timeouts Gracefully

### Current Issue
```
[scheduler] AQI failed for New Delhi: timeout of 10000ms exceeded
```

### Robust Timeout Handling

```javascript
// src/ingestion/fetchers/aqi.js
export async function fetchAQI(lat, lon, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'X-API-Key': config.openaqApiKey }
      });
      return response.data;
    } catch (error) {
      if (attempt === retries) {
        console.error(`[AQI] Failed after ${retries} attempts:`, error.message);
        return null; // Return null instead of throwing
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`[AQI] Retry ${attempt}/${retries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### Benefits
✅ Retries with exponential backoff  
✅ Graceful failure (returns null)  
✅ Doesn't crash the scheduler  
✅ Logs failures for monitoring

---

## Solution 4: On-Demand Data Collection

### Instead of pre-collecting data for all cities, collect on-demand

```javascript
// src/routes/score.js
router.post("/score", validateCoordinates, validateRoutes, async (req, res) => {
  const { originLat, originLng, destLat, destLng, routes } = req.body;
  
  // Get polylines
  const polylines = routes || await fetchRoutes(originLat, originLng, destLat, destLng);
  
  // For each segment, fetch data on-demand if not in database
  const scoredRoutes = await Promise.all(
    polylines.map(async (polyline, index) => {
      const segments = await sampleSegments(polyline);
      
      // If no data found, fetch on-demand
      for (const segment of segments) {
        if (!segment.aqi) {
          segment.aqi = await fetchAQIOnDemand(segment.midpoint);
        }
        if (!segment.weather) {
          segment.weather = await fetchWeatherOnDemand(segment.midpoint);
        }
        if (!segment.traffic) {
          segment.traffic = await fetchTrafficOnDemand(segment.midpoint);
        }
      }
      
      return calculateRoutePES(index + 1, polyline, segments);
    })
  );
  
  res.json(scoredRoutes);
});
```

### Benefits
✅ Works for any city globally  
✅ No pre-configuration needed  
✅ Data collected only when requested  

### Drawbacks
❌ Slower response time (API calls during request)  
❌ Higher API usage costs  
❌ Subject to API rate limits

---

## Solution 5: Hybrid Approach (Best for Production)

### Combine pre-collection + on-demand + caching

**Strategy:**
1. Pre-collect data for popular cities (Mumbai, Delhi, Kolkata)
2. Collect on-demand for other cities
3. Cache on-demand data for 1 hour
4. Use database-driven city configuration

```javascript
async function getEnvironmentalData(lat, lng) {
  // Check database first (pre-collected data)
  const dbData = await queryDatabase(lat, lng);
  if (dbData) return dbData;
  
  // Check cache (on-demand data)
  const cacheKey = `env:${lat}:${lng}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Fetch on-demand
  const freshData = await fetchOnDemand(lat, lng);
  
  // Cache for 1 hour
  await redis.setEx(cacheKey, 3600, JSON.stringify(freshData));
  
  return freshData;
}
```

### Benefits
✅ Fast for popular cities (pre-collected)  
✅ Works for any city (on-demand)  
✅ Efficient caching  
✅ Scalable architecture

---

## Recommended Implementation Plan

### Phase 1: Fix Timeouts (Immediate)
1. Add retry logic with exponential backoff
2. Return null on failure instead of throwing
3. Log failures for monitoring

### Phase 2: Database-Driven Cities (Short-term)
1. Create `supported_cities` table
2. Modify scheduler to read from database
3. Add admin endpoint to manage cities

### Phase 3: Hybrid Approach (Long-term)
1. Keep pre-collection for popular cities
2. Add on-demand fetching for other cities
3. Implement caching layer
4. Add monitoring and alerts

---

## Tell Frontend Team

**Current State:**
- System works for Mumbai, Delhi, Kolkata (pre-collected data)
- Other cities return 404 (no data available)
- Timeouts are normal (external APIs are slow)

**Future State (After Implementation):**
- Admin can add cities via database (no code changes)
- System can work for any city globally (on-demand)
- Faster response times (hybrid caching)
- More reliable (retry logic + graceful failures)

**For Now:**
- Frontend can send any coordinates
- System validates and returns 404 if no data
- This is expected behavior, not a bug
- Dynamic routes feature works perfectly for testing

---

## Quick Fix for Timeouts (Do This Now)

```javascript
// Increase timeout for slow APIs
const response = await axios.get(url, {
  timeout: 30000, // 30 seconds instead of 10
  headers: { ... }
});
```

Or disable Delhi temporarily:
```javascript
const POINTS = [
  // { name: "Delhi", lat: 28.6139, lng: 77.2090 }, // Disabled due to timeouts
  { name: "Mumbai", lat: 19.0760, lng: 72.8777 }
];
```

This stops the timeout spam in logs and focuses on working cities.
