#!/bin/bash

echo "🚦 Testing Traffic API Endpoint"
echo "================================"

echo ""
echo "Test 1: Mumbai Traffic (CST to BKC)"
echo "------------------------------------"
curl "http://localhost:3000/api/traffic?lat=19.0728&lon=72.8826" | jq '.'








echo ""
echo ""
echo "Test 2: Delhi Traffic (CP to India Gate)"
echo "-----------------------------------------"
curl "http://localhost:3000/api/traffic?lat=28.6139&lon=77.2090" | jq '.'








echo ""
echo ""
echo "Test 3: Kolkata Traffic (Park Street to Howrah)"
echo "------------------------------------------------"
curl "http://localhost:3000/api/traffic?lat=22.5726&lon=88.3639" | jq '.'
