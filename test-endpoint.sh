#!/bin/bash

# Quick test script for the /api/score endpoint
# Usage: ./test-endpoint.sh

echo "🧪 Testing /api/score endpoint with Ola Maps"
echo ""

# Check if server is running
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "❌ Server is not running on port 3000"
    echo "Start it with: npm run dev"
    exit 1
fi

echo "✅ Server is running"
echo ""

# Test 1: Mumbai
echo "📍 Test 1: Mumbai Route"
echo "Request: Mumbai CST → Bandra"
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{"originLat": 19.0760, "originLng": 72.8777, "destLat": 19.0850, "destLng": 72.8950}' \
  2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if isinstance(data, list):
        print(f'✅ Success! Got {len(data)} route(s)')
        for i, route in enumerate(data, 1):
            print(f'   Route {i}: PES={route[\"pes\"]:.2f}, Distance={route[\"distance\"]:.2f}km, Duration={route[\"duration\"]:.0f}min, Points={len(route[\"polyline\"])}')
    else:
        print(f'❌ Error: {data.get(\"error\", \"Unknown error\")}')
except Exception as e:
    print(f'❌ Failed to parse response: {e}')
"
echo ""

# Test 2: Pune (known to return 2 routes)
echo "📍 Test 2: Pune Route (should return 2 routes)"
echo "Request: Pune coordinates"
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{"originLat": 18.7603, "originLng": 73.3814, "destLat": 18.7335, "destLng": 73.4459}' \
  2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if isinstance(data, list):
        print(f'✅ Success! Got {len(data)} route(s)')
        for i, route in enumerate(data, 1):
            print(f'   Route {i}: PES={route[\"pes\"]:.2f}, Distance={route[\"distance\"]:.2f}km, Duration={route[\"duration\"]:.0f}min, Points={len(route[\"polyline\"])}')
    else:
        print(f'❌ Error: {data.get(\"error\", \"Unknown error\")}')
except Exception as e:
    print(f'❌ Failed to parse response: {e}')
"
echo ""

# Test 3: Delhi
echo "📍 Test 3: Delhi Route"
echo "Request: Connaught Place → India Gate"
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{"originLat": 28.6139, "originLng": 77.2090, "destLat": 28.6280, "destLng": 77.2200}' \
  2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if isinstance(data, list):
        print(f'✅ Success! Got {len(data)} route(s)')
        for i, route in enumerate(data, 1):
            print(f'   Route {i}: PES={route[\"pes\"]:.2f}, Distance={route[\"distance\"]:.2f}km, Duration={route[\"duration\"]:.0f}min, Points={len(route[\"polyline\"])}')
    else:
        print(f'❌ Error: {data.get(\"error\", \"Unknown error\")}')
except Exception as e:
    print(f'❌ Failed to parse response: {e}')
"
echo ""

echo "✨ Testing complete!"
echo ""
echo "💡 Tips:"
echo "   - First request is slower (calls Ola Maps API)"
echo "   - Subsequent requests are cached (1 hour)"
echo "   - Number of routes varies by location (1-3 routes)"
echo "   - Check logs with: docker-compose logs -f backend"
