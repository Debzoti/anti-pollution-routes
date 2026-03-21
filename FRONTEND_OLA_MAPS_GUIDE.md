# Frontend Guide: Using the New Ola Maps Backend

## What Changed?

**Before:** Frontend had to call Ola Maps API, get routes, then send routes to backend.

**Now:** Frontend only sends origin/destination coordinates. Backend handles everything.

## How to Use

### Simple Request Format

Send only **4 numbers** to the backend:

```javascript
const response = await fetch('http://localhost:3000/api/score', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    originLat: 19.0760,    // Starting point latitude
    originLng: 72.8777,    // Starting point longitude
    destLat: 19.0850,      // Destination latitude
    destLng: 72.8950       // Destination longitude
  })
});

const routes = await response.json();
```

### What You Get Back

An array of scored routes, sorted by best to worst:

```javascript
[
  {
    routeId: "route-1",           // Best route
    pes: 45.2,                    // Pollution Exposure Score (lower = better)
    distance: 12.5,               // Distance in km
    duration: 25,                 // Duration in minutes
    aqi: 85,                      // Average Air Quality Index
    traffic: 0.6,                 // Traffic level (0-1)
    polyline: [                   // Array of [lng, lat] points
      [72.8777, 19.0760],
      [72.8780, 19.0765],
      [72.8785, 19.0770],
      // ... more points
    ]
  },
  {
    routeId: "route-2",           // Second best route
    pes: 48.7,
    // ... same structure
  },
  {
    routeId: "route-3",           // Third best route
    pes: 52.1,
    // ... same structure
  }
]
```

## Example: React Component

```javascript
import { useState } from 'react';

function RouteScorer() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);

  const scoreRoutes = async (origin, destination) => {
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:3000/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originLat: origin.lat,
          originLng: origin.lng,
          destLat: destination.lat,
          destLng: destination.lng
        })
      });

      if (!response.ok) {
        throw new Error('Failed to score routes');
      }

      const scoredRoutes = await response.json();
      setRoutes(scoredRoutes);
    } catch (error) {
      console.error('Error scoring routes:', error);
      alert('Failed to get routes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading && <p>Finding best routes...</p>}
      
      {routes.map(route => (
        <div key={route.routeId}>
          <h3>{route.routeId}</h3>
          <p>Pollution Score: {route.pes}</p>
          <p>Distance: {route.distance} km</p>
          <p>Duration: {route.duration} min</p>
          <p>Air Quality: {route.aqi}</p>
        </div>
      ))}
    </div>
  );
}
```

## Displaying Routes on Map

Use the `polyline` array to draw routes on your map:

### Google Maps Example

```javascript
const route = routes[0]; // Best route

const path = route.polyline.map(([lng, lat]) => ({
  lat: lat,
  lng: lng
}));

const polyline = new google.maps.Polyline({
  path: path,
  geodesic: true,
  strokeColor: '#FF0000',
  strokeOpacity: 1.0,
  strokeWeight: 4
});

polyline.setMap(map);
```

### Mapbox Example

```javascript
const route = routes[0]; // Best route

map.addSource('route', {
  type: 'geojson',
  data: {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: route.polyline // Already in [lng, lat] format
    }
  }
});

map.addLayer({
  id: 'route',
  type: 'line',
  source: 'route',
  paint: {
    'line-color': '#FF0000',
    'line-width': 4
  }
});
```

## Understanding the Polyline

Each route has a `polyline` array with many coordinate points:

```javascript
polyline: [
  [72.8777, 19.0760],  // Point 1: [longitude, latitude]
  [72.8780, 19.0765],  // Point 2
  [72.8785, 19.0770],  // Point 3
  // ... 50-200 more points
]
```

**Important:**
- Format is `[longitude, latitude]` (NOT lat/lng)
- Each point is a location along the route
- Routes follow real roads (from Ola Maps)
- More points = more detailed route

## Error Handling

Handle these error cases:

```javascript
try {
  const response = await fetch('http://localhost:3000/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originLat, originLng, destLat, destLng })
  });

  if (response.status === 404) {
    // No environmental data available for this area
    alert('No data available for this route. Try a different location.');
    return;
  }

  if (response.status === 429) {
    // Rate limit exceeded
    alert('Too many requests. Please wait a moment and try again.');
    return;
  }

  if (!response.ok) {
    throw new Error('Failed to score routes');
  }

  const routes = await response.json();
  // Use routes...
  
} catch (error) {
  console.error('Error:', error);
  alert('Failed to get routes. Please check your connection.');
}
```

## Testing Coordinates

Use these coordinates to test:

### Mumbai (Works well)
```javascript
{
  originLat: 19.0760,
  originLng: 72.8777,
  destLat: 19.0850,
  destLng: 72.8950
}
```

### Delhi (Works well)
```javascript
{
  originLat: 28.6139,
  originLng: 77.2090,
  destLat: 28.6280,
  destLng: 77.2200
}
```

### Kolkata (May have limited data)
```javascript
{
  originLat: 22.5726,
  originLng: 88.3639,
  destLat: 22.5800,
  destLng: 88.3700
}
```

## Performance

- **First request**: Takes 2-5 seconds (calls Ola Maps API + scores routes)
- **Cached requests**: Instant (< 100ms)
- **Cache duration**: 1 hour
- **Max routes**: 3 routes per request

## Common Issues

### "No environmental data available"

**Cause:** Route doesn't pass near any monitoring stations.

**Solution:** Try coordinates in major cities (Mumbai, Delhi, Bangalore).

### "Ola Maps API authentication failed"

**Cause:** Backend doesn't have valid Ola Maps API key.

**Solution:** Contact backend team to add `OLA_MAPS_API_KEY` to `.env` file.

### "Rate limit exceeded"

**Cause:** Too many requests to Ola Maps API.

**Solution:** Wait a moment and try again. Backend caches results to minimize API calls.

## Questions?

Contact the backend team or check:
- `OLA_MAPS_INTEGRATION.md` - Backend implementation details
- `DYNAMIC_ROUTES_API.md` - Full API documentation
- `POSTMAN_TESTING_GUIDE.md` - Testing guide
