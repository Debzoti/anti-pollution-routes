# System Architecture Explained

## Overview
This is a **real-time environmental routing system** that calculates the Pollution Exposure Score (PES) for routes based on live environmental data. The system uses a **data ingestion → storage → scoring** pipeline.

---

## Why 15-Minute Cron Jobs?

### The Problem
Environmental conditions change constantly:
- **Air Quality (PM2.5, PM10, NO2, O3)**: Changes every 10-15 minutes based on traffic, wind, industrial activity
- **Weather (wind speed, direction, humidity)**: Changes every 15-30 minutes
- **Traffic (congestion, speed)**: Changes every 5-10 minutes during peak hours

### The Solution
We run **background cron jobs** to continuously collect fresh environmental data:

```javascript
// AQI — every 15 minutes
cron.schedule("*/15 * * * *", async () => { ... });

// Weather — every 30 minutes  
cron.schedule("*/30 * * * *", async () => { ... });

// Traffic — every 10 minutes
cron.schedule("*/10 * * * *", async () => { ... });
```

### Why These Intervals?

1. **AQI (15 minutes)**:
   - OpenAQ API updates every 10-15 minutes
   - Air quality changes gradually but needs frequent updates
   - Balance between freshness and API rate limits

2. **Weather (30 minutes)**:
   - Weather changes slower than AQI/traffic
   - OpenWeatherMap API has rate limits (60 calls/min)
   - 30 minutes is sufficient for wind direction/speed changes

3. **Traffic (10 minutes)**:
   - Traffic is the most dynamic factor
   - TomTom API provides real-time traffic flow
   - 10 minutes captures rush hour changes

---

## Data Collection Points

We collect data from **28 monitoring stations** across 3 cities:

```javascript
const POINTS = [
  // Mumbai - 8 stations
  { lat: 19.076, lon: 72.8777, label: "Mumbai CST" },
  { lat: 19.0596, lon: 72.8656, label: "Mumbai BKC" },
  // ... 6 more

  // Delhi - 12 stations  
  { lat: 28.6139, lon: 77.209, label: "Delhi CP" },
  { lat: 28.6519, lon: 77.1909, label: "Delhi Karol Bagh" },
  // ... 10 more

  // Kolkata - 8 stations
  { lat: 22.5726, lon: 88.3639, label: "Kolkata Park Street" },
  // ... 7 more
];
```

### Why Multiple Points Per City?
- **City-wide coverage**: A single point can't represent a 50km² city
- **Spatial accuracy**: Routes pass through different areas with different pollution levels
- **2km radius matching**: Each station covers ~2km radius (PostGIS query)

---

## What Happens Every 15 Minutes?

### Step 1: Data Ingestion (Scheduler)
```
For each of 28 stations:
  1. Fetch AQI from OpenAQ API
  2. Fetch Weather from OpenWeatherMap API  
  3. Fetch Traffic from TomTom API
  4. Normalize the data
  5. Write to TimescaleDB
```

**Time taken**: ~86 seconds per cycle
- 28 stations × (1.8s AQI + 0.5s Weather + 0.8s Traffic) = ~86s

### Step 2: Data Storage (TimescaleDB)
Data is stored in 3 tables with timestamps:

```sql
air_quality (time, lat, lng, pm25, pm10, no2, o3, aqi, ...)
weather_snapshots (time, lat, lng, temp, wind_speed, wind_deg, ...)
traffic_conditions (time, lat, lng, free_flow_speed, current_speed, ...)
```

**Retention**: Data older than 15 minutes is considered stale

---

## What Happens When User Requests a Route?

### Step 1: Route Fetching
```
User sends: { originLat, originLng, destLat, destLng }
↓
Ola Maps API returns: polyline (array of [lng, lat] coordinates)
```

### Step 2: Segment Sampling
The route polyline is broken into segments:

```javascript
// Example polyline with 100 points
polyline = [[77.21, 28.63], [77.22, 28.64], ..., [77.25, 28.55]]

// Creates 99 segments (point[i] → point[i+1])
segments = [
  { start: [77.21, 28.63], end: [77.22, 28.64], midpoint: [77.215, 28.635] },
  { start: [77.22, 28.64], end: [77.23, 28.65], midpoint: [77.225, 28.645] },
  // ... 97 more segments
]
```

### Step 3: Environmental Data Lookup (The Critical Part!)
For **each segment midpoint**, we query the database:

```sql
-- Find nearest AQI reading within 2km, collected in last 15 minutes
SELECT * FROM air_quality
WHERE time > NOW() - INTERVAL '15 minutes'
  AND ST_DWithin(
    ST_MakePoint(longitude, latitude)::geography,
    ST_MakePoint($midLng, $midLat)::geography,
    2000  -- 2km radius
  )
ORDER BY ST_Distance(...) ASC
LIMIT 1;
```

**This query runs 3 times per segment** (AQI, Weather, Traffic)!

### Step 4: PES Calculation
For each segment with environmental data:

```javascript
segmentPES = pm25 × trafficWeight × windFactor × timeInSegment

Where:
- pm25: Air quality (from database)
- trafficWeight: current_speed / free_flow_speed (from database)
- windFactor: cos(bearing - wind_direction) (from database)
- timeInSegment: distance / cyclist_speed (calculated)
```

**Total route PES** = sum of all segment PES values

---

## Why "Environmental Data Not Found" Error?

This error occurs when the database has **no recent data** for the route area.

### Root Causes:

1. **Server just started** (most common)
   - Cron jobs haven't run yet
   - Database is empty
   - **Solution**: Wait 15-30 minutes for first data collection cycle

2. **Route outside supported cities**
   - We only collect data in Mumbai, Delhi, Kolkata
   - Route in Bangalore/Chennai/Pune will fail
   - **Solution**: Use coordinates within supported cities

3. **Route too far from monitoring stations**
   - Route is >2km from all 28 stations
   - PostGIS query returns no results
   - **Solution**: Add more monitoring stations in that area

4. **API failures during ingestion**
   - OpenAQ/OpenWeatherMap/TomTom API down
   - Network issues
   - Rate limit exceeded
   - **Solution**: Check scheduler logs, wait for next cycle

### Early Exit Logic
To fail fast, we check the **first 3 segments**:

```javascript
// If first 3 segments have no data, throw error immediately
if (noDataCount === 3) {
  throw new Error("No environmental data available for this region...");
}
```

This prevents wasting time querying 100+ segments when the region is unsupported.

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKGROUND PROCESS                        │
│                    (Runs Continuously)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │   CRON SCHEDULER (every 15 min)      │
        │   - Fetch AQI (28 stations)          │
        │   - Fetch Weather (28 stations)      │
        │   - Fetch Traffic (28 stations)      │
        └──────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │   TIMESCALEDB (PostgreSQL + PostGIS) │
        │   - air_quality table                │
        │   - weather_snapshots table          │
        │   - traffic_conditions table         │
        │   (Stores last 15 min of data)       │
        └──────────────────────────────────────┘
                              │
                              │ (Query on demand)
                              │
┌─────────────────────────────────────────────────────────────┐
│                    USER REQUEST FLOW                         │
│                    (On-Demand)                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │   POST /api/score                    │
        │   { originLat, originLng,            │
        │     destLat, destLng }               │
        └──────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │   Ola Maps API                       │
        │   Returns: polyline (100 points)    │
        └──────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │   Segment Sampler                    │
        │   - Break into 99 segments           │
        │   - For each segment midpoint:       │
        │     * Query nearest AQI (2km)        │
        │     * Query nearest Weather (2km)    │
        │     * Query nearest Traffic (2km)    │
        └──────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │   PES Calculator                     │
        │   - Calculate segment PES            │
        │   - Sum all segments                 │
        │   - Return total route PES           │
        └──────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │   Response to User                   │
        │   { routeId, polyline, pes: 84375 }  │
        └──────────────────────────────────────┘
```

---

## Performance Characteristics

### Data Ingestion (Background)
- **Frequency**: Every 10-30 minutes depending on data type
- **Duration**: ~86 seconds per cycle (28 stations)
- **API Calls**: 84 calls per cycle (28 × 3 APIs)
- **Database Writes**: 84 inserts per cycle

### Route Scoring (On-Demand)
- **Route Fetch**: ~500ms (Ola Maps API)
- **Segment Sampling**: ~2-5 seconds (99 segments × 3 queries = 297 DB queries)
- **PES Calculation**: ~50ms (in-memory math)
- **Total Response Time**: ~3-6 seconds

### Optimization: Redis Cache
```javascript
// Cache key: route coordinates
cacheKey = `route:${originLat}:${originLng}:${destLat}:${destLng}`

// TTL: 1 hour (3600 seconds)
// Rationale: Environmental data changes every 15 min, 
//            but route geometry is stable
```

---

## Why This Architecture?

### Alternative 1: Fetch APIs on Every Request ❌
```
User request → Fetch AQI → Fetch Weather → Fetch Traffic → Calculate PES
```
**Problems**:
- 3 external API calls per segment = 297 API calls per route
- Response time: 30-60 seconds (unacceptable)
- API rate limits exceeded immediately
- API costs skyrocket

### Alternative 2: Pre-compute All Routes ❌
```
Pre-calculate PES for all possible routes in the city
```
**Problems**:
- Infinite route combinations
- Storage requirements: petabytes
- Stale data (routes change every 15 min)

### Our Solution: Hybrid Approach ✅
```
Background: Collect data at fixed points (28 stations)
On-Demand: Interpolate data for any route using PostGIS
```
**Benefits**:
- Fast response time (3-6 seconds)
- Fresh data (15 min old max)
- Scalable (works for any route in supported cities)
- Cost-effective (84 API calls per 15 min vs 297 per request)

---

## Troubleshooting

### "Environmental data not found" error

**Check 1: Server uptime**
```bash
# Check when server started
pm2 logs anti-pollution-routes --lines 50 | grep "scheduler"

# If server started <15 min ago, wait for first data collection
```

**Check 2: Database has data**
```sql
-- Check latest AQI data
SELECT COUNT(*), MAX(time) FROM air_quality;

-- Check latest weather data  
SELECT COUNT(*), MAX(time) FROM weather_snapshots;

-- Check latest traffic data
SELECT COUNT(*), MAX(time) FROM traffic_conditions;
```

**Check 3: Coordinates in supported cities**
```javascript
// Supported bounds
MUMBAI:  { minLat: 18.9, maxLat: 19.3, minLng: 72.7, maxLng: 73 }
DELHI:   { minLat: 28.4, maxLat: 28.9, minLng: 76.8, maxLng: 77.4 }
KOLKATA: { minLat: 22.4, maxLat: 22.9, minLng: 88.2, maxLng: 88.6 }
```

**Check 4: Scheduler running**
```bash
# Check scheduler logs
pm2 logs anti-pollution-routes | grep "scheduler"

# Should see:
# [scheduler] Running AQI ingestion...
# [scheduler] AQI: stored 5 readings for Mumbai CST
# [scheduler] Running Weather ingestion...
```

---

## Summary

**Why 15-minute cron jobs?**
- Environmental data changes constantly
- We need fresh data for accurate PES calculations
- Background collection is faster and cheaper than on-demand fetching

**What are we calculating?**
- **PES (Pollution Exposure Score)** = sum of segment-level pollution exposure
- Each segment considers: PM2.5, traffic congestion, wind direction, travel time

**Why "environmental data not found"?**
- Database is empty (server just started)
- Route outside supported cities (Mumbai/Delhi/Kolkata)
- Route too far from monitoring stations (>2km)
- API failures during data collection

**The key insight**: We collect data at **fixed points** (28 stations) and **interpolate** for any route using PostGIS spatial queries. This gives us the best of both worlds: fresh data + fast response times.
