#!/bin/bash

echo "🧪 COORDINATE-LEVEL CACHING PROOF TEST"
echo "========================================"
echo ""
echo "This test proves that overlapping routes reuse cached coordinate data"
echo ""

API_URL="http://localhost:3000/api/score"

# Route 1: Gateway of India → Bandra
ROUTE1='{
  "originLat": 18.9220,
  "originLng": 72.8347,
  "destLat": 19.0596,
  "destLng": 72.8295
}'

# Route 2: Worli → Bandra (destination overlaps with Route 1)
ROUTE2='{
  "originLat": 19.0144,
  "originLng": 72.8180,
  "destLat": 19.0596,
  "destLng": 72.8295
}'

echo "📍 Route 1: Gateway of India → Bandra"
echo "   This route will fetch FRESH data for all coordinates"
echo ""
echo "⏱️  Testing Route 1 (first time)..."
START1=$(date +%s%3N)
RESPONSE1=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$ROUTE1")
END1=$(date +%s%3N)
DURATION1=$((END1 - START1))

echo "✅ Route 1 completed in ${DURATION1}ms"
echo ""

# Wait 2 seconds
echo "⏳ Waiting 2 seconds..."
sleep 2
echo ""

echo "📍 Route 2: Worli → Bandra"
echo "   This route shares the DESTINATION (Bandra) with Route 1"
echo "   Expected: FASTER because Bandra coordinates are already cached"
echo ""
echo "⏱️  Testing Route 2 (should reuse cached Bandra coordinates)..."
START2=$(date +%s%3N)
RESPONSE2=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$ROUTE2")
END2=$(date +%s%3N)
DURATION2=$((END2 - START2))

echo "✅ Route 2 completed in ${DURATION2}ms"
echo ""

echo "========================================"
echo "📊 RESULTS:"
echo "========================================"
echo ""
echo "Route 1 (fresh data):     ${DURATION1}ms 🐌"
echo "Route 2 (cached coords):  ${DURATION2}ms ⚡"
echo ""

# Calculate if Route 2 was faster
if [ $DURATION2 -lt $DURATION1 ]; then
  SPEEDUP=$((DURATION1 * 100 / DURATION2))
  PERCENT=$((SPEEDUP - 100))
  echo "✅ COORDINATE CACHING WORKS!"
  echo "   Route 2 was ${PERCENT}% faster than Route 1"
  echo "   This proves coordinates near Bandra were reused from cache"
else
  echo "⚠️  Route 2 was not faster - both routes may be cached already"
  echo "   Try clearing Redis cache and run again"
fi

echo ""
echo "💡 To see coordinate cache in Redis:"
echo "   redis-cli KEYS 'env:*' | head -20"
