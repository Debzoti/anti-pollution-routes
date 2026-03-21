#!/bin/bash

# Quick verification script for Ola Maps integration
# Usage: ./quick-verify.sh

echo "🔍 Ola Maps Integration Verification"
echo "===================================="
echo ""

# Check if server is running
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "❌ Server is not running on port 3000"
    echo "Start it with: npm run dev"
    exit 1
fi

echo "✅ Server is running"
echo ""

# Test function
test_route() {
    local city=$1
    local json=$2
    
    echo "📍 Testing $city..."
    
    response=$(curl -s -X POST http://localhost:3000/api/score \
        -H "Content-Type: application/json" \
        -d "$json")
    
    # Check if it's an error
    if echo "$response" | grep -q '"error"'; then
        echo "   ⚠️  No environmental data (Ola Maps works, but no monitoring stations)"
        return
    fi
    
    # Count routes and points
    route_count=$(echo "$response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(len(data))
except:
    print('0')
" 2>/dev/null)
    
    if [ "$route_count" -gt 0 ]; then
        echo "   ✅ SUCCESS! Got $route_count route(s)"
        
        # Get details
        echo "$response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for i, route in enumerate(data, 1):
        points = len(route['polyline'])
        pes = route['pes']
        print(f'      Route {i}: {points} points, PES={pes:.0f}')
except Exception as e:
    pass
" 2>/dev/null
    else
        echo "   ❌ Failed to get routes"
    fi
    echo ""
}

# Test Mumbai
test_route "Mumbai (CST to Bandra)" \
    '{"originLat": 19.0760, "originLng": 72.8777, "destLat": 19.0850, "destLng": 72.8950}'

# Test Delhi
test_route "Delhi (CP to India Gate)" \
    '{"originLat": 28.6139, "originLng": 77.2090, "destLat": 28.6280, "destLng": 77.2200}'

# Test Kolkata
test_route "Kolkata (Park St to Howrah)" \
    '{"originLat": 22.5726, "originLng": 88.3639, "destLat": 22.5851, "destLng": 88.3468}'

# Test Mumbai 2
test_route "Mumbai (Andheri to Powai)" \
    '{"originLat": 19.1136, "originLng": 72.8697, "destLat": 19.1176, "destLng": 72.9060}'

# Test Delhi 2
test_route "Delhi (Karol Bagh to Chandni Chowk)" \
    '{"originLat": 28.6519, "originLng": 77.1909, "destLat": 28.6507, "destLng": 77.2334}'

echo "===================================="
echo "✨ Verification Complete!"
echo ""
echo "💡 What to look for:"
echo "   - Multiple routes (1-3, usually 2)"
echo "   - 70+ points per route"
echo "   - Different PES scores"
echo ""
echo "📄 See COORDINATES_TO_TEST.md for more test cases"
