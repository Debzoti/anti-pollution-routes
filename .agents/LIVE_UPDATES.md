# Live Route Updates Feature

## Overview

The live updates feature provides real-time route recommendations to users via Server-Sent Events (SSE). When pollution, traffic, or weather conditions change, the system automatically re-scores routes every 15 minutes and pushes updates to connected clients.

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client    │◄────────│  SSE Stream  │◄────────│  Heartbeat  │
│  (Browser)  │  HTTP   │  /api/updates│  Notify │   Worker    │
└─────────────┘         └──────────────┘         └─────────────┘
                               │                         │
                               │                         │
                               ▼                         ▼
                        ┌──────────────┐         ┌─────────────┐
                        │    Redis     │◄────────│  Re-score   │
                        │    Cache     │  Update │   Routes    │
                        └──────────────┘         └─────────────┘
```

## Components

### 1. SSE Endpoint (`/api/updates`)

**Location:** `src/routes/sse.js`

Clients connect to this endpoint to receive live updates:

```javascript
GET /api/updates?originLat=22.5726&originLng=88.3639&destLat=22.6500&destLng=88.4200
```

**Response:** Server-Sent Events stream

```
data: {"type":"connected","routeKey":"22.5726:88.3639:22.6500:88.4200"}

data: {"type":"route_update","timestamp":"2026-03-21T14:30:00.000Z","routes":[...],"bestRoute":{...}}
```

### 2. Heartbeat Worker

**Location:** `src/jobs/heartbeat.js`

Runs every 15 minutes to:
1. Re-score predefined popular routes
2. Re-score any routes with active SSE listeners
3. Compare new scores with cached scores
4. Broadcast updates if routes changed significantly

**Key Logic:**
- Route is considered "changed" if:
  - Best route ID changed, OR
  - PES score changed by more than 5 points
- Updates Redis cache with new scores
- Broadcasts to all connected clients for that route

### 3. Redis Integration

**Purpose:**
- Cache current route scores
- Enable comparison with new scores
- Provide fast lookups for SSE clients

**Cache Key Format:** `route:${originLat}:${originLng}:${destLat}:${destLng}`

**TTL:** 1 hour (3600 seconds)

### 4. Live Demo Page

**Location:** `public/live-demo.html`

Interactive demo showing:
- Real-time connection status
- Current best route
- All alternative routes
- Live notifications when routes update
- Beautiful UI with animations

## Usage

### For Frontend Developers

**1. Connect to SSE endpoint:**

```javascript
const eventSource = new EventSource(
  `/api/updates?originLat=22.5726&originLng=88.3639&destLat=22.6500&destLng=88.4200`
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'connected') {
    console.log('Connected:', data.routeKey);
  } else if (data.type === 'route_update') {
    console.log('New best route:', data.bestRoute);
    updateMap(data.routes); // Update your map UI
  }
};

eventSource.onerror = () => {
  console.error('Connection lost');
};
```

**2. Fetch initial routes:**

```javascript
const response = await fetch('/api/score', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    originLat: 22.5726,
    originLng: 88.3639,
    destLat: 22.6500,
    destLng: 88.4200
  })
});

const routes = await response.json();
displayRoutes(routes);
```

**3. Handle updates:**

```javascript
function updateMap(routes) {
  // Clear old routes
  map.clearRoutes();
  
  // Draw new routes (best route highlighted)
  routes.forEach((route, index) => {
    map.drawRoute(route.polyline, {
      color: index === 0 ? 'green' : 'gray',
      weight: index === 0 ? 5 : 3
    });
  });
  
  // Show notification
  showNotification(`Better route found! PES: ${routes[0].pes}`);
}
```

## Testing

### 1. Start the server:

```bash
node server.js
```

### 2. Open the demo page:

```
http://localhost:3000/live-demo.html
```

### 3. Or test programmatically:

```bash
node test-sse-live-updates.js
```

### 4. Trigger manual heartbeat (for testing):

```javascript
import { runHeartbeat } from './src/jobs/heartbeat.js';
await runHeartbeat();
```

## Configuration

### Update Frequency

Change the cron schedule in `src/jobs/heartbeat.js`:

```javascript
// Current: every 15 minutes
cron.schedule("*/15 * * * *", async () => { ... });

// Every 5 minutes:
cron.schedule("*/5 * * * *", async () => { ... });

// Every hour:
cron.schedule("0 * * * *", async () => { ... });
```

### Change Detection Threshold

Adjust the PES difference threshold in `src/jobs/heartbeat.js`:

```javascript
// Current: 5 points
if (Math.abs(oldBestRoute.pes - newBestRoute.pes) > 5) {
  routeChanged = true;
}

// More sensitive (2 points):
if (Math.abs(oldBestRoute.pes - newBestRoute.pes) > 2) {
  routeChanged = true;
}
```

### Popular Routes

Add more routes to monitor in `src/jobs/heartbeat.js`:

```javascript
const POPULAR_ROUTES = [
  {
    originLat: 22.5726,
    originLng: 88.3639,
    destLat: 22.6500,
    destLng: 88.4200,
    label: "Kolkata Route 1"
  },
  // Add more...
];
```

## Monitoring

### Check active connections:

```javascript
import { getActiveConnectionsCount, getMonitoredRoutes } from './src/routes/sse.js';

console.log('Active connections:', getActiveConnectionsCount());
console.log('Monitored routes:', getMonitoredRoutes());
```

### Server logs:

```
[SSE] Client connected for route: 22.5726:88.3639:22.6500:88.4200
[SSE] Active connections: 1
[heartbeat] Starting scheduled scoring...
[heartbeat] 🔄 Route changed for Kolkata Route 1:
   Old: route-1 (PES: 1250)
   New: route-2 (PES: 1180)
[SSE] Broadcasted update to 1 clients for route: 22.5726:88.3639:22.6500:88.4200
```

## Performance Considerations

### Connection Limits

Each SSE connection keeps an HTTP connection open. Monitor server resources:

```bash
# Check open connections
netstat -an | grep :3000 | wc -l

# Check Node.js memory
node --max-old-space-size=4096 server.js
```

### Redis Memory

Monitor Redis memory usage:

```bash
redis-cli INFO memory
```

### Database Load

Heartbeat queries can be expensive. Consider:
- Adding database indexes
- Batching queries
- Caching segment data

## Troubleshooting

### SSE not connecting:

1. Check server is running: `curl http://localhost:3000/health`
2. Check Redis is running: `redis-cli ping`
3. Check browser console for errors
4. Verify CORS headers if using different domain

### No updates received:

1. Check heartbeat is running: Look for `[heartbeat]` logs
2. Verify route has changed significantly (>5 PES difference)
3. Check Redis cache: `redis-cli GET "route:22.5726:88.3639:22.6500:88.4200"`
4. Manually trigger heartbeat for testing

### Memory leaks:

1. Ensure clients close connections properly
2. Check for orphaned connections in `activeConnections` Map
3. Monitor with: `process.memoryUsage()`

## Future Enhancements

- [ ] WebSocket support for bidirectional communication
- [ ] User-specific route subscriptions
- [ ] Push notifications via service workers
- [ ] Historical route quality trends
- [ ] Predictive route recommendations
- [ ] Multi-city support
- [ ] Route quality alerts (email/SMS)

## Demo Moment 🎉

**The "Wow" Experience:**

1. User opens the demo page
2. Enters their route coordinates
3. Clicks "Connect & Monitor Route"
4. Sees current best route immediately
5. **15 minutes later:** Screen updates automatically with a better route!
6. Notification appears: "🔄 Route updated! Better route found."
7. Map redraws with new recommended route
8. **No refresh needed** - it just works!

This is the killer feature that makes your app feel alive and intelligent.
