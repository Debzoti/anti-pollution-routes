# Traffic API Guide

## Overview

The Traffic API provides real-time traffic data for routes in Indian cities (Mumbai, Delhi, Kolkata). Traffic levels are calculated based on Ola Maps data with city-specific thresholds.

## Endpoint

```
POST /api/traffic
```

## Request

```json
{
  "originLat": 19.0728,
  "originLng": 72.8826,
  "destLat": 19.0596,
  "destLng": 72.8656
}
```

## Response

```json
{
  "city": "mumbai",
  "routes": [
    {
      "routeId": "route-1",
      "distance": 3864,
      "duration": 471,
      "distanceText": "3.86 km",
      "durationText": "8 min",
      "trafficSegments": [
        {
          "start": {
            "lat": 19.0728,
            "lng": 72.8826
          },
          "end": {
            "lat": 19.0724,
            "lng": 72.8831
          },
          "trafficLevel": "low",
          "color": "#00C853",
          "olaRawValue": 0
        },
        {
          "start": {
            "lat": 19.0724,
            "lng": 72.8831
          },
          "end": {
            "lat": 19.0720,
            "lng": 72.8835
          },
          "trafficLevel": "moderate",
          "color": "#FFB300",
          "olaRawValue": 5
        },
        {
          "start": {
            "lat": 19.0715,
            "lng": 72.8840
          },
          "end": {
            "lat": 19.0710,
            "lng": 72.8845
          },
          "trafficLevel": "high",
          "color": "#D32F2F",
          "olaRawValue": 10
        }
      ],
      "trafficSummary": {
        "city": "mumbai",
        "overallCondition": "moderate",
        "lowSegments": 15,
        "moderateSegments": 8,
        "highSegments": 3,
        "totalSegments": 26
      }
    }
  ]
}
```

## Traffic Levels

Traffic levels are calculated based on Ola Maps raw values (0-10) with city-specific thresholds:

### Mumbai
- **Low**: 0-3 (Green #00C853)
- **Moderate**: 4-7 (Orange #FFB300)
- **High**: 8-10 (Red #D32F2F)

### Delhi
- **Low**: 0-2 (Green #00C853)
- **Moderate**: 3-6 (Orange #FFB300)
- **High**: 7-10 (Red #D32F2F)

### Kolkata
- **Low**: 0-2 (Green #00C853)
- **Moderate**: 3-5 (Orange #FFB300)
- **High**: 6-10 (Red #D32F2F)

## Frontend Implementation

### 1. Fetch Traffic Data

```javascript
async function getTrafficData(origin, destination) {
  const response = await fetch('http://localhost:3000/api/traffic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originLat: origin.lat,
      originLng: origin.lng,
      destLat: destination.lat,
      destLng: destination.lng,
    }),
  });
  
  return await response.json();
}
```

### 2. Display Traffic on Map

```javascript
function displayTrafficOnMap(trafficData, map) {
  const route = trafficData.routes[0]; // First route
  
  // Draw each traffic segment with its color
  route.trafficSegments.forEach(segment => {
    const line = new google.maps.Polyline({
      path: [
        { lat: segment.start.lat, lng: segment.start.lng },
        { lat: segment.end.lat, lng: segment.end.lng }
      ],
      strokeColor: segment.color,
      strokeWeight: 6,
      strokeOpacity: 0.8,
      map: map
    });
  });
}
```

### 3. Show Traffic Summary

```javascript
function displayTrafficSummary(trafficData) {
  const summary = trafficData.routes[0].trafficSummary;
  
  return `
    <div class="traffic-summary">
      <h3>Traffic Conditions in ${summary.city}</h3>
      <p>Overall: <span class="${summary.overallCondition}">${summary.overallCondition}</span></p>
      <ul>
        <li>🟢 Clear: ${summary.lowSegments} segments</li>
        <li>🟠 Moderate: ${summary.moderateSegments} segments</li>
        <li>🔴 Heavy: ${summary.highSegments} segments</li>
      </ul>
    </div>
  `;
}
```

### 4. Traffic Legend

```javascript
const trafficLegend = {
  low: { label: 'Clear', color: '#00C853', icon: '🟢' },
  moderate: { label: 'Moderate Traffic', color: '#FFB300', icon: '🟠' },
  high: { label: 'Heavy Traffic', color: '#D32F2F', icon: '🔴' }
};
```

## Use Cases

### 1. Route Comparison
Compare traffic conditions across multiple routes to choose the best one.

### 2. Traffic Visualization
Draw color-coded routes on map showing traffic conditions.

### 3. Traffic Alerts
Alert users about heavy traffic segments on their route.

### 4. ETA Adjustment
Adjust estimated time of arrival based on traffic conditions.

## Error Handling

```javascript
try {
  const trafficData = await getTrafficData(origin, destination);
  
  if (trafficData.error) {
    console.error('Traffic API error:', trafficData.error);
    // Show fallback UI
  }
} catch (error) {
  console.error('Network error:', error);
  // Show error message to user
}
```

## Testing

```bash
# Test Mumbai traffic
curl -X POST http://localhost:3000/api/traffic \
  -H "Content-Type: application/json" \
  -d '{"originLat": 19.0728, "originLng": 72.8826, "destLat": 19.0596, "destLng": 72.8656}'

# Or use the test script
./test-traffic-api.sh
```

## Notes

- Traffic data is fetched in real-time from Ola Maps
- City detection is automatic based on coordinates
- Traffic levels are relative to each city's typical conditions
- Response includes multiple alternative routes when available
- Each segment has start/end coordinates for precise visualization
