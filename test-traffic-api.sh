#!/bin/bash

echo "🚦 Testing Traffic API Endpoint"
echo "================================"

echo ""
echo "Test 1: Mumbai Traffic (CST to BKC)"
echo "------------------------------------"
curl -X POST http://localhost:3000/api/traffic \
  -H "Content-Type: application/json" \
  -d '{
    "originLat": 19.0728,
    "originLng": 72.8826,
    "destLat": 19.0596,
    "destLng": 72.8656
  }' | jq '.'

echo ""
echo ""
echo "Test 2: Delhi Traffic (CP to India Gate)"
echo "-----------------------------------------"
curl -X POST http://localhost:3000/api/traffic \
  -H "Content-Type: application/json" \
  -d '{
    "originLat": 28.6139,
    "originLng": 77.2090,
    "destLat": 28.6280,
    "destLng": 77.2200
  }' | jq '.'

echo ""
echo ""
echo "Test 3: Kolkata Traffic (Park Street to Howrah)"
echo "------------------------------------------------"
curl -X POST http://localhost:3000/api/traffic \
  -H "Content-Type: application/json" \
  -d '{
    "originLat": 22.5726,
    "originLng": 88.3639,
    "destLat": 22.5851,
    "destLng": 88.3468
  }' | jq '.'
