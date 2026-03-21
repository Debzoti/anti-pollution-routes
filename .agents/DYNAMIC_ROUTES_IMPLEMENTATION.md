# Dynamic Route Input - Implementation Summary

## Overview

Implemented support for frontend to send custom route polylines to the `/score` endpoint, enabling testing without OpenRouteService API restrictions while maintaining performance and supporting multiple cities.

## Changes Made

### 1. Route Validation Middleware (`src/middleware/validateRoutes.js`)

**New Features:**
- ✅ Validates route structure (array of polylines)
- ✅ Enforces limits aligned with OpenRouteService API
- ✅ Validates coordinate format and ranges
- ✅ Provides detailed error messages with hints

**Limits Enforced:**
```javascript
MAX_ROUTES: 3              // Match OpenRouteService
MAX_POINTS_PER_ROUTE: 500  // Prevent DB overload
MAX_TOTAL_POINTS: 1000     // Total cap across all routes
```

**Validation Checks:**
- Routes is an array
- At least 1 route, max 3 routes
- Each route has 2-500 points
- Each coordinate is `[longitude, latitude]`
- Longitude: -180 to 180
- Latitude: -90 to 90
- No NaN or Infinity values
- Total points ≤ 1000

### 2. Coordinate Validation Update (`src/middleware/validateCoordinates.js`)

**Changes:**
- ❌ Removed Kolkata-only geographic bounds restriction
- ✅ Kept bounds for SSE endpoint (still needs it)
- ✅ Validates coordinate format and ranges globally
- ✅ Skips validation when routes are provided

**Rationale:**
- Support multiple cities (Kolkata, Delhi, Mumbai)
- Allow frontend to test with any coordinates
- Early exit in scoring handles unsupported regions

### 3. Early Exit Logic (`src/scoring/segmentSampler.js`)

**New Feature:**
- ✅ Checks first 3 segments for environmental data
- ✅ If all 3 return NULL → throws error immediately
- ✅ Saves unnecessary database queries

**Error Message:**
```
"No environmental data available for this region. 
Currently supported cities: Kolkata, Delhi, Mumbai. 
Data is collected within 500m radius of sampled points."
```

**Performance Impact:**
- Unsupported region: 9 queries (3 segments × 3 queries) then exit
- Without early exit: Would execute all queries (e.g., 297 for 100-point route)
- Savings: ~97% fewer queries for unsupported regions

### 4. Enhanced Error Handling (`src/routes/score.js`)

**Improvements:**
- ✅ Specific error for no environmental data (404)
- ✅ Specific error for missing API key (500)
- ✅ Generic error with details (500)
- ✅ Helpful hints for users

**Error Types:**
```javascript
// No data available
404: "No environmental data available for this region"

// API configuration error
500: "Route service configuration error"

// Generic error
500: "Failed to score routes" + details
```

### 5. Documentation Updates

**Files Updated:**
- ✅ `DYNAMIC_ROUTES_API.md` - Complete API documentation
- ✅ `test-dynamic-routes.js` - Comprehensive test suite
- ✅ `.agents/DYNAMIC_ROUTES_IMPLEMENTATION.md` - This file

## Performance Analysis

### Database Query Load

**Per-segment queries:** 3 (AQI, Weather, Traffic)

**Example loads:**
- 50-point route: 49 segments × 3 = 147 queries
- 100-point route: 99 segments × 3 = 297 queries
- 500-point route: 499 segments × 3 = 1,497 queries
- Max (1000 points): 999 segments × 3 = 2,997 queries

**With early exit:**
- Unsupported region: 3 segments × 3 = 9 queries then stop
- Supported region: Full query load

### Response Time Targets

**Target:** <2 seconds

**Factors:**
- Database query time: ~5-10ms per query
- 300 queries: ~1.5-3 seconds
- 1500 queries: ~7.5-15 seconds (exceeds target)
- 3000 queries: ~15-30 seconds (way over target)

**Mitigation:**
- Limits prevent excessive queries
- Early exit saves resources
- Redis caching (1 hour TTL)
- Parallel query execution

## Multi-City Support

### Currently Supported Cities

**Data ingestion configured for:**
- Kolkata: 22.5°N-22.9°N, 88.2°E-88.6°E
- Delhi: 28.6°N, 77.2°E
- Mumbai: 19.1°N, 72.9°E

**How it works:**
1. Frontend sends routes with any global coordinates
2. Validation checks format and ranges (not geographic bounds)
3. Scoring queries database for environmental data
4. If first 3 segments have no data → 404 error
5. If data found → continue scoring

### Adding New Cities

**Steps:**
1. Update `src/jobs/scheduler.js` - add city to `POINTS` array
2. Ensure data ingestion is running for that city
3. No code changes needed in validation or scoring
4. Update documentation with new city

## Testing

### Test Coverage

**Comprehensive test suite:** `test-dynamic-routes.js`

**Tests included:**
1. ✅ Coordinate-based request (Kolkata)
2. ✅ Route-based request (Kolkata)
3. ✅ Too many routes (expect 400)
4. ✅ Route too large (expect 400)
5. ✅ Invalid route structure (expect 400)
6. ✅ Out of range coordinates (expect 400)
7. ✅ Unsupported region - New York (expect 404)
8. ✅ Delhi coordinates (should work if data available)
9. ✅ Cache behavior (same request twice)

**Run tests:**
```bash
node test-dynamic-routes.js
```

## API Compatibility

### Backward Compatibility

**Existing coordinate-based requests:**
- ✅ Work exactly as before
- ✅ Same validation (except no Kolkata bounds)
- ✅ Same response format
- ✅ Same caching behavior

**Breaking changes:**
- ❌ None - fully backward compatible

### New Capabilities

**Route-based requests:**
- ✅ Send custom polylines
- ✅ Bypass OpenRouteService API
- ✅ Test with any coordinates
- ✅ Same scoring algorithm
- ✅ Same response format

## Security & Rate Limiting

### Protection Mechanisms

**Input validation:**
- ✅ Type checking (arrays, numbers)
- ✅ Range validation (lat/lng bounds)
- ✅ Size limits (routes, points)
- ✅ NaN/Infinity checks

**Performance protection:**
- ✅ Max 3 routes per request
- ✅ Max 500 points per route
- ✅ Max 1000 total points
- ✅ Early exit for unsupported regions

**Rate limiting:**
- ⚠️  Not implemented yet (future enhancement)
- Recommendation: Add rate limiting middleware
- Suggested: 100 requests/minute per IP

## Known Limitations

### Current Constraints

1. **Response time:** May exceed 2 seconds for large routes (500+ points)
2. **Geographic coverage:** Limited to cities with data ingestion
3. **Data freshness:** 15-minute window for environmental data
4. **Query radius:** 500 meters (may miss data in sparse areas)

### Future Enhancements

**Potential improvements:**
1. Add rate limiting middleware
2. Implement request coalescing for identical concurrent requests
3. Add route simplification algorithm (reduce points automatically)
4. Support for route metadata (name, description)
5. Return confidence scores for PES calculations
6. Add detailed breakdown of PES components per segment

## Deployment Checklist

### Pre-deployment

- [x] Code implemented and tested
- [x] No syntax errors
- [x] Documentation updated
- [x] Test suite created
- [ ] Run test suite against staging
- [ ] Verify data ingestion is running
- [ ] Check Redis is connected
- [ ] Verify database has recent data

### Post-deployment

- [ ] Monitor error rates
- [ ] Check response times
- [ ] Verify cache hit rates
- [ ] Monitor database query load
- [ ] Check for 404 errors (unsupported regions)
- [ ] Verify multi-city support

## Monitoring Recommendations

### Metrics to Track

**Request metrics:**
- Request count by type (coordinate vs route)
- Response time by type
- Error rate by error type
- Cache hit rate

**Performance metrics:**
- Database query count per request
- Average query time
- Early exit rate (404 errors)
- Total points per request

**Business metrics:**
- Supported vs unsupported region requests
- Most requested cities
- Route complexity (avg points per route)

### Alerts to Set

**Critical:**
- Error rate > 10%
- Response time > 5 seconds
- Database connection failures

**Warning:**
- Cache hit rate < 50%
- Early exit rate > 30%
- Average points per route > 300

## Conclusion

The dynamic route input feature is fully implemented with:
- ✅ Proper validation and limits
- ✅ Early exit optimization
- ✅ Multi-city support
- ✅ Backward compatibility
- ✅ Comprehensive error handling
- ✅ Performance protection
- ✅ Complete documentation
- ✅ Test suite

The system is ready for testing and deployment.
