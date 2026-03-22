# API Response Format

## New Response Structure

The `/api/score` endpoint now returns an object instead of a plain array.

### Response Object

```json
{
  "success": true,
  "count": 3,
  "routes": [
    {
      "routeId": 1,
      "pes": 45.23,
      "distance": 15420,
      "duration": 1820,
      "distanceText": "15.4 km",
      "durationText": "30 min",
      "polyline": [[72.8777, 19.076], ...],
      "traffic": [
        {
          "congestionLevel": "moderate",
          "averageSpeed": 25.5,
          "freeFlowSpeed": 40.0,
          "delaySeconds": 180
        }
      ],
      "segments": [...]
    },
    {
      "routeId": 2,
      "pes": 48.67,
      ...
    },
    {
      "routeId": 3,
      "pes": 52.11,
      ...
    }
  ]
}
```

## Response Fields

### Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` for successful responses |
| `count` | number | Number of routes returned |
| `routes` | array | Array of route objects, sorted by PES (lowest first) |

### Route Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `routeId` | number | Route identifier (1, 2, 3, ...) |
| `pes` | number | Pollution Exposure Score (lower = better) |
| `distance` | number | Route distance in meters |
| `duration` | number | Estimated travel time in seconds |
| `distanceText` | string | Human-readable distance (e.g., "15.4 km") |
| `durationText` | string | Human-readable duration (e.g., "30 min") |
| `polyline` | array | Array of [lng, lat] coordinates |
| `traffic` | array | Overall traffic data for the route |
| `segments` | array | Detailed segment-by-segment environmental data |

## Example Request

```bash
POST http://localhost:3000/api/score
Content-Type: application/json

{
  "originLat": 19.0760,
  "originLng": 72.8777,
  "destLat": 19.1176,
  "destLng": 72.9060
}
```

## Example Response

```json
{
  "success": true,
  "count": 3,
  "routes": [
    {
      "routeId": 1,
      "pes": 42.15,
      "distance": 14230,
      "duration": 1680,
      "distanceText": "14.2 km",
      "durationText": "28 min",
      "polyline": [
        [72.8777, 19.076],
        [72.8790, 19.078],
        [72.8805, 19.080]
      ],
      "traffic": [
        {
          "congestionLevel": "low",
          "averageSpeed": 32.5,
          "freeFlowSpeed": 40.0,
          "delaySeconds": 120
        }
      ],
      "segments": [
        {
          "start": [72.8777, 19.076],
          "end": [72.8790, 19.078],
          "midpoint": [72.87835, 19.077],
          "distanceMeters": 250,
          "bearing": 45.2,
          "aqi": {
            "pm25": 45.2,
            "pm10": 78.5,
            "aqi": 95
          },
          "weather": {
            "temp_celsius": 28.5,
            "humidity_pct": 65,
            "wind_speed_ms": 3.2
          },
          "traffic": {
            "current_speed": 35.0,
            "congestion_level": "low"
          }
        }
      ]
    },
    {
      "routeId": 2,
      "pes": 45.89,
      "distance": 15100,
      "duration": 1920,
      "distanceText": "15.1 km",
      "durationText": "32 min",
      "polyline": [...],
      "traffic": [...],
      "segments": [...]
    },
    {
      "routeId": 3,
      "pes": 48.23,
      "distance": 16500,
      "duration": 2100,
      "distanceText": "16.5 km",
      "durationText": "35 min",
      "polyline": [...],
      "traffic": [...],
      "segments": [...]
    }
  ]
}
```

## Error Response Format

Errors still return an object with error details:

```json
{
  "error": "Failed to score routes",
  "details": "No routes found from Ola Maps API"
}
```

## Migration Guide

### Before (Array Response)

```javascript
const response = await axios.post('/api/score', requestBody);
const routes = response.data; // Array
const bestRoute = routes[0];
const routeCount = routes.length;
```

### After (Object Response)

```javascript
const response = await axios.post('/api/score', requestBody);
const { success, count, routes } = response.data; // Object
const bestRoute = routes[0];
const routeCount = count; // or routes.length
```

## Benefits of New Format

1. **Extensible**: Easy to add metadata (timestamp, API version, etc.)
2. **Consistent**: Matches standard REST API patterns
3. **Self-documenting**: `count` field shows number of routes without checking array length
4. **Success indicator**: `success` field clearly indicates successful response
5. **Future-proof**: Can add pagination, filters, or other metadata without breaking changes

## Backward Compatibility

This is a **breaking change**. Frontend applications need to update their code to access `response.data.routes` instead of `response.data`.

Update your frontend code:
```javascript
// OLD
const routes = response.data;

// NEW
const { routes } = response.data;
// or
const routes = response.data.routes;
```
