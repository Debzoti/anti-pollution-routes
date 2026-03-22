#!/bin/bash

echo "Testing new response format..."
echo ""

# Test with Mumbai coordinates
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{
    "originLat": 19.0760,
    "originLng": 72.8777,
    "destLat": 19.0850,
    "destLng": 72.8950
  }' | jq '{success, count, routeCount: (.routes | length), firstRoute: .routes[0] | {routeId, pes, distance, duration}}'

echo ""
echo "Expected: Object with success, count, and routes fields"
