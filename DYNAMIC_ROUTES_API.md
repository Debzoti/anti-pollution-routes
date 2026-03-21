# Dynamic Route Input API

## Overview

The `/score` endpoint now supports two modes:
1. **Coordinate-based** (existing): Send coordinates, backend fetches routes from OpenRouteService
2. **Route-based** (new): Send your own route polylines, backend scores them directly

## API Limits & Constraints

### Route Limits (Aligned with OpenRouteService)
- **Maximum routes per request:** 3
- **Maximum points per route:** 500
- **Maximum total points:** 1,000 across all routes

### Geographic Coverage
- **Supported cities:** Kolkata, Delhi, Mumbai
- **Global coordinates accepted:** Yes, but scoring requires environmental data
- **Early exit:** If first 3 segments have no data, returns 404 error

### Performance
- **Target response time:** <2 seconds
- **Database queries per segment:** 3 (AQI, Weather, Traffic)
- **Query radius:** 500 meters from segment midpoint
- **Data freshness:** Last 15 minutes

## API Usage

### Option 1: Coordinate-based Request (Existing Behavior)

```javascript
POST /score
Content-Type: application/json

{
  "originLat": 22.5726,
  "originLng": 88.3639,
  "destLat": 22.5958,
  "destLng": 88.4026
}
```

### Option 2: Route-based Request (New Feature)

```javascript
POST /score
Content-Type: application/json

{
  "routes": [
    [
      [88.3639, 22.5726],  // [longitude, latitude]
      [88.3700, 22.5750],
      [88.3800, 22.5850],
      [88.4026, 22.5958]
    ],
    [
      [88.3639, 22.5726],
      [88.3650, 22.5800],
      [88.3900, 22.5900],
      [88.4026, 22.5958]
    ]
  ]
}
```

## Route Format

- `routes`: Array of polylines (max 3)
- Each polyline: Array of coordinate pairs (2-500 points)
- Each coordinate: `[longitude, latitude]` (both numbers)
- Longitude range: `-180` to `180`
- Latitude range: `-90` to `90`
- Total points across all routes: max 1,000

## Response Format

Both request types return the same response format:

```javascript
[
  {
    "routeId": "route-1",
    "polyline": [[lng, lat], [lng, lat], ...],
    "pes": 150  // Pollution Exposure Score (lower is better)
  },
  {
    "routeId": "route-2",
    "polyline": [[lng, lat], [lng, lat], ...],
    "pes": 175
  }
]
```

Routes are sorted by PES in ascending order (best route first).

## Error Responses

### Too Many Routes (400)
```javascript
{
  "error": "Too many routes. Maximum 3 routes allowed",
  "received": 5,
  "hint": "This limit matches OpenRouteService API behavior"
}
```

### Route Too Large (400)
```javascript
{
  "error": "Route 0 has too many points",
  "details": "Maximum 500 points per route",
  "received": 750,
  "hint": "Consider simplifying the route polyline"
}
```

### Total Points Exceeded (400)
```javascript
{
  "error": "Too many total points across all routes",
  "details": "Maximum 1000 total points allowed",
  "received": 1200,
  "hint": "Reduce the number of routes or simplify the polylines"
}
```

### Invalid Coordinate (400)
```javascript
{
  "error": "Invalid coordinate at route 0, point 1",
  "details": "Expected [longitude, latitude] where both are numbers",
  "received": [88.3639, "invalid"]
}
```

### Out of Range Coordinate (400)
```javascript
{
  "error": "Coordinate out of range at route 0, point 0",
  "details": "Longitude must be between -180 and 180",
  "received": [200, 22.5726]
}
```

### No Environmental Data (404)
```javascript
{
  "error": "No environmental data available for this region. Currently supported cities: Kolkata, Delhi, Mumbai. Data is collected within 500m radius of sampled points.",
  "hint": "Try coordinates in supported cities or check if data ingestion is running"
}
```

## Benefits

1. **No API restrictions**: Frontend can test without depending on OpenRouteService
2. **Custom routes**: Use routes from any source (HERE, Google Maps, custom algorithms)
3. **Backward compatible**: Existing coordinate-based requests work unchanged
4. **Cached results**: Both request types benefit from Redis caching (1 hour TTL)
5. **Same scoring logic**: All routes scored using the same PES algorithm
6. **Multi-city support**: Works with any city that has environmental data
7. **Performance protection**: Limits prevent database overload
8. **Early exit**: Fast failure for unsupported regions (saves resources)

## Performance Considerations

### Database Query Load
- Each segment requires 3 PostGIS spatial queries
- Example: 100-point route = 99 segments × 3 = 297 queries
- Max load: 1000 points = 999 segments × 3 = 2,997 queries

### Early Exit Optimization
- System checks first 3 segments for environmental data
- If all 3 return no data → immediate 404 error
- Saves unnecessary database queries for unsupported regions

### Caching Strategy
- Route-based requests: SHA-256 hash of route data as cache key
- Coordinate-based requests: `route:{lat}:{lng}:{lat}:{lng}` as cache key
- TTL: 1 hour (3600 seconds)
- Cache hit = instant response (no DB queries)

## Testing

Run the test script to verify functionality:

```bash
node test-dynamic-routes.js
```

## Multi-City Support

### Currently Supported Cities
- **Kolkata**: 22.5°N-22.9°N, 88.2°E-88.6°E
- **Delhi**: 28.4°N-28.9°N, 76.8°E-77.3°E  
- **Mumbai**: 19.0°N-19.3°N, 72.8°E-73.0°E

### Adding New Cities
1. Update data ingestion in `src/jobs/scheduler.js`
2. Add city coordinates to `POINTS` array
3. Ensure AQI, weather, and traffic data is being collected
4. No code changes needed in validation or scoring logic

## Notes

- When `routes` field is provided, coordinate validation is skipped
- Coordinates are optional when sending routes
- Cache keys are generated differently for route-based vs coordinate-based requests
- All routes are scored in parallel for optimal performance
- Geographic bounds are NOT enforced at validation level
- System returns 404 if no environmental data is available during scoring

