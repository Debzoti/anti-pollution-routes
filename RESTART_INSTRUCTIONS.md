# How to Apply the Coverage Fix

## ⚠️ IMPORTANT: You Must Restart the Server!

The changes are in the code, but **the old server is still running with only 2 monitoring stations**.

---

## Step-by-Step Instructions

### Step 1: Stop the Current Server

```bash
# Find and kill the Node.js process
pkill -f "node.*index.js"

# Or if using Docker
docker-compose down
```

### Step 2: Start the Server Fresh

```bash
# If using npm
npm run dev

# Or if using Docker
docker-compose up -d
```

### Step 3: Verify Server Started

Check the logs - you should see:

```
[scheduler] All cron jobs registered — AQI:15min, Weather:30min, Traffic:10min
```

### Step 4: Wait for Data Collection

**CRITICAL**: You must wait for the scheduler to collect data!

- **After 10 minutes**: Traffic data available
- **After 15 minutes**: AQI data available  
- **After 30 minutes**: All data available

### Step 5: Monitor Data Collection

Watch the logs to see data being collected:

```bash
# If using npm
# (logs will show in the terminal)

# If using Docker
docker-compose logs -f backend | grep scheduler
```

You should see messages like:
```
[scheduler] Running AQI ingestion...
[scheduler] AQI: stored 44 readings for Mumbai CST
[scheduler] AQI: stored 44 readings for Mumbai BKC
[scheduler] AQI: stored 44 readings for Delhi Dwarka
[scheduler] AQI: stored 44 readings for Delhi Rohini
...
[scheduler] Weather: stored for Mumbai Andheri
[scheduler] Traffic: stored for Delhi Rajiv Chowk
```

### Step 6: Test After 30 Minutes

Now test the routes that were failing:

```bash
# Test Delhi Dwarka to Rajiv Chowk
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{"originLat": 28.5921, "originLng": 77.0460, "destLat": 28.6328, "destLng": 77.2197}'

# Test Delhi Rohini to Lajpat Nagar
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{"originLat": 28.7495, "originLng": 77.0736, "destLat": 28.5678, "destLng": 77.2432}'
```

---

## Why You Need to Restart

### Before Restart (Current State)
```javascript
// Old server is running with:
const POINTS = [
  { lat: 28.6139, lon: 77.209, label: "New Delhi" },
  { lat: 19.076, lon: 72.8777, label: "Mumbai" },
];
// Only 2 stations!
```

### After Restart (New State)
```javascript
// New server will run with:
const POINTS = [
  // 8 Mumbai stations
  // 12 Delhi stations (including Dwarka, Rohini, Rajiv Chowk)
  // 8 Kolkata stations
];
// 28 stations total!
```

---

## Troubleshooting

### "Still getting no data error"

**Possible causes:**

1. **Server not restarted**
   - Solution: Kill and restart the server

2. **Not enough time passed**
   - Solution: Wait 30 minutes after restart

3. **Scheduler not running**
   - Check logs for `[scheduler]` messages
   - Should see messages every 10-15 minutes

4. **Database connection issue**
   - Check logs for database errors
   - Verify PostgreSQL is running

### Check if New Stations Are Active

```bash
# Check server logs
docker-compose logs backend | grep "Delhi Dwarka"
docker-compose logs backend | grep "Delhi Rohini"

# Should see:
# [scheduler] AQI: stored X readings for Delhi Dwarka
# [scheduler] Weather: stored for Delhi Rohini
```

### Verify Database Has Data

```sql
-- Connect to database
psql -U postgres -d anti_pollution

-- Check recent data
SELECT location_name, COUNT(*) 
FROM air_quality 
WHERE time > NOW() - INTERVAL '1 hour' 
GROUP BY location_name;

-- Should show all 28 stations
```

---

## Current Monitoring Stations (After Restart)

### Mumbai (8 stations)
- CST, BKC, Andheri, Dadar, Kurla, South, Powai, Worli

### Delhi (12 stations) ← EXPANDED
- CP, Karol Bagh, Nehru Place, Chandni Chowk
- Saket, Rohini, Lajpat Nagar, India Gate
- **Dwarka** ← NEW
- **Rajiv Chowk** ← NEW  
- **Rohini Sector 7** ← NEW
- **Rajouri Garden** ← NEW

### Kolkata (8 stations)
- Park Street, Howrah, Esplanade, Salt Lake
- Ballygunge, Sealdah, New Town, Victoria

---

## Timeline

```
T+0 min:  Restart server
T+10 min: Traffic data starts appearing
T+15 min: AQI data starts appearing
T+30 min: All data available
T+30 min: Test routes - should work!
```

---

## Quick Verification

After 30 minutes, run this to verify:

```bash
# Should return routes with scores (not error)
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{"originLat": 28.5921, "originLng": 77.0460, "destLat": 28.6328, "destLng": 77.2197}' \
  | python3 -m json.tool | head -20
```

Expected output:
```json
[
  {
    "routeId": "route-1",
    "pes": 12345,
    "distance": 15.2,
    "duration": 35,
    ...
  }
]
```

NOT:
```json
{
  "error": "No environmental data available..."
}
```

---

## Summary

1. ✅ Stop server: `pkill -f "node.*index.js"`
2. ✅ Start server: `npm run dev`
3. ✅ Wait 30 minutes
4. ✅ Test routes
5. ✅ Enjoy full coverage!

**The code changes are done - you just need to restart!** 🚀
