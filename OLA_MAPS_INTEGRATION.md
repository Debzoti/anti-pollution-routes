# Ola Maps Backend Integration

## Status: ✅ WORKING - Using Ola Maps Basic API

**Update:** Ola Maps API integration is now working! Using the Basic API endpoint which provides optimized routing for Indian roads.

## Current Implementation

The backend uses **Ola Maps Basic API** to fetch route polylines. This provides excellent routing optimized for Indian roads and traffic conditions.

**Note:** Ola Maps Basic API returns 1 route (the optimal route). For multiple alternative routes, an upgrade to the Advanced API would be needed.

## Architecture

**Frontend → Backend Flow:**
1. Frontend sends only **4 coordinates**: `originLat`, `originLng`, `destLat`, `destLng`
2. Backend calls **Ola Maps Basic API** to get the optimal route
3. Backend scores the route using environmental data
4. Backend returns scored route to frontend

**Benefits:**
- Frontend stays simple - only sends origin/destination
- Backend controls all routing logic
- Optimized routing for Indian roads (Ola Maps specializes in India)
- Includes real-time traffic data
- Consistent API interface for frontend

## Setup

### 1. Get Ola Maps API Key

Sign up at [Ola Maps Developer Portal](https://maps.olakrutrim.com/) and get your API key.

### 2. Add API Key to .env

```bash
OLA_MAPS_API_KEY=your_actual_ola_maps_api_key_here
```

### 3. Restart the Server

```bash
npm run dev
# or
docker-compose up -d
```

## API Usage

### Coordinate-Based Request (Uses Ola Maps)

**Endpoint:** `POST /api/score`

**Request Body:**
```json
{
  "originLat": 19.0760,
  "originLng": 72.8777,
  "destLat": 19.0850,
  "destLng": 72.8950
}
```

**What Happens:**
1. Backend validates coordinates
2. Backend calls Ola Maps API with origin/destination
3. Ola Maps returns up to 3 route polylines (following real roads)
4. Backend scores each route using environmental data
5. Backend returns sorted routes (best route first)

**Response:**
```json
[
  {
    "routeId": "route-1",
    "pes": 45.2,
    "distance": 12.5,
    "duration": 25,
    "aqi": 85,
    "traffic": 0.6,
    "polyline": [[72.8777, 19.0760], [72.8780, 19.0765], ...]
  },
  {
    "routeId": "route-2",
    "pes": 48.7,
    ...
  }
]
```

### Custom Route Request (Bypasses Ola Maps)

If frontend already has routes from another source, it can send them directly:

**Request Body:**
```json
{
  "routes": [
    [[72.8777, 19.0760], [72.8780, 19.0765], ...],
    [[72.8777, 19.0760], [72.8785, 19.0770], ...],
    [[72.8777, 19.0760], [72.8790, 19.0775], ...]
  ]
}
```

**What Happens:**
1. Backend validates routes (max 3 routes, 500 points per route)
2. Backend skips Ola Maps API call
3. Backend scores provided routes directly
4. Backend returns sorted routes

## Implementation Details

### Files Modified

1. **`.env`** - Added `OLA_MAPS_API_KEY`
2. **`config.js`** - Added `olaMapsApiKey` configuration
3. **`src/scoring/olaMapsFetcher.js`** - New file for Ola Maps API integration
4. **`src/routes/score.js`** - Updated to use `fetchRoutesFromOla` instead of `fetchRoutes`

### Ola Maps API Details

**Endpoint:** `https://api.olamaps.io/routing/v1/directions`

**Request Format:**
```json
{
  "origin": "19.0760,72.8777",
  "destination": "19.0850,72.8950",
  "mode": "driving",
  "alternatives": 3,
  "api_key": "your_api_key"
}
```

**Response Format:**
```json
{
  "routes": [
    {
      "geometry": {
        "coordinates": [[72.8777, 19.0760], [72.8780, 19.0765], ...]
      },
      "distance": 12500,
      "duration": 1500
    }
  ]
}
```

### Error Handling

The implementation handles various error scenarios:

- **401 Unauthorized**: Invalid API key
- **429 Rate Limit**: Too many requests
- **400 Bad Request**: Invalid coordinates
- **Timeout**: Request takes longer than 10 seconds
- **No Routes Found**: Ola Maps couldn't find a route

All errors are logged and returned to frontend with helpful messages.

## Testing

### Test with Postman

**Mumbai Test:**
```json
POST http://localhost:3000/api/score
Content-Type: application/json

{
  "originLat": 19.0760,
  "originLng": 72.8777,
  "destLat": 19.0850,
  "destLng": 72.8950
}
```

**Delhi Test:**
```json
{
  "originLat": 28.6139,
  "originLng": 77.2090,
  "destLat": 28.6280,
  "destLng": 77.2200
}
```

### Expected Behavior

1. **First Request**: Calls Ola Maps API, scores routes, caches result (1 hour TTL)
2. **Subsequent Requests**: Returns cached result instantly
3. **After 1 Hour**: Cache expires, calls Ola Maps API again

## Fallback to OpenRouteService

If you need to switch back to OpenRouteService:

1. Open `src/routes/score.js`
2. Change line 32 from:
   ```javascript
   const polylines = routes || await fetchRoutesFromOla(originLat, originLng, destLat, destLng);
   ```
   to:
   ```javascript
   const polylines = routes || await fetchRoutes(originLat, originLng, destLat, destLng);
   ```

## Rate Limits

Ola Maps API has rate limits. To handle this:

1. **Caching**: All routes are cached for 1 hour in Redis
2. **Error Handling**: 429 errors are caught and returned to frontend
3. **Timeout**: Requests timeout after 10 seconds

If you hit rate limits frequently, consider:
- Increasing cache TTL (currently 3600 seconds)
- Implementing request queuing
- Upgrading your Ola Maps API plan

## Monitoring

Check logs for Ola Maps API calls:

```bash
docker-compose logs -f backend
```

Look for:
- `[olaMapsFetcher] Error fetching routes from Ola Maps` - API errors
- `[score] Cache hit for route:...` - Cache hits (good!)
- `[score] Error scoring routes` - General errors

## Support

For Ola Maps API issues:
- Documentation: https://maps.olakrutrim.com/docs
- Support: Contact Ola Maps support team
- Status: Check Ola Maps API status page
