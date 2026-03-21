# Design Document: Dynamic Route Input

## Overview

This feature extends the `/score` endpoint to accept optional route polyline data from the frontend, enabling clients to provide their own routes instead of relying solely on OpenRouteService. The design maintains full backward compatibility while adding flexibility for frontend teams to test with custom route data.

The core modification involves checking for an optional `routes` field in the request body. When present, the system bypasses the OpenRouteService API call and directly scores the provided polylines. When absent, the system behaves exactly as before, fetching routes from OpenRouteService using the provided coordinates.

## Architecture

### Request Flow

**Current Flow (Coordinate-based):**
```
Frontend → POST /score {originLat, originLng, destLat, destLng}
         → validateCoordinates middleware
         → Check Redis cache (coordinate-based key)
         → fetchRoutes() from OpenRouteService
         → calculateRoutePES() for each polyline
         → Sort by PES
         → Cache result
         → Return scored routes
```

**New Flow (Route-based):**
```
Frontend → POST /score {originLat, originLng, destLat, destLng, routes: [...]}
         → validateCoordinates middleware
         → validateRoutes middleware (NEW)
         → Check Redis cache (route-based key)
         → Skip fetchRoutes(), use provided routes
         → calculateRoutePES() for each polyline
         → Sort by PES
         → Cache result
         → Return scored routes
```

### Decision Logic

The endpoint will use this decision tree:

1. If `req.body.routes` exists and is valid → use provided routes
2. If `req.body.routes` is missing → fetch from OpenRouteService (existing behavior)
3. If `req.body.routes` exists but is invalid → return 400 error

## Components and Interfaces

### 1. Route Validation Middleware

**File:** `src/middleware/validateRoutes.js` (NEW)

**Purpose:** Validate the structure and content of provided route polylines

**Interface:**
```javascript
export function validateRoutes(req, res, next)
```

**Validation Rules:**
- `routes` must be an array
- Array must contain at least one route
- Each route must be an array of coordinate pairs
- Each coordinate pair must be `[longitude, latitude]` where both are numbers
- Longitude must be in range `[-180, 180]`
- Latitude must be in range `[-90, 90]`

**Error Responses:**
```javascript
// Missing routes when expected
{ error: "routes must be an array", received: typeof routes }

// Empty array
{ error: "At least one route is required", received: [] }

// Invalid route structure
{ 
  error: "Invalid route structure at index X",
  details: "Each route must be an array of [longitude, latitude] pairs"
}

// Invalid coordinate
{
  error: "Invalid coordinate at route X, point Y",
  details: "Expected [longitude, latitude] where both are numbers",
  received: [...]
}

// Out of range
{
  error: "Coordinate out of range at route X, point Y",
  details: "Longitude must be [-180, 180], Latitude must be [-90, 90]",
  received: [lng, lat]
}
```

### 2. Modified Score Route Handler

**File:** `src/routes/score.js` (MODIFIED)

**Changes:**
1. Add conditional middleware: apply `validateRoutes` only when `routes` field is present
2. Add route source detection logic
3. Modify cache key generation to handle both coordinate-based and route-based keys
4. Skip `fetchRoutes()` call when routes are provided

**Pseudocode:**
```javascript
router.post("/score", validateCoordinates, async (req, res) => {
  const { originLat, originLng, destLat, destLng, routes } = req.body;
  
  // Validate routes if provided
  if (routes !== undefined) {
    const validationError = validateRoutesData(routes);
    if (validationError) {
      return res.status(400).json(validationError);
    }
  }
  
  // Generate cache key
  const cacheKey = routes 
    ? generateRouteCacheKey(routes)
    : `route:${originLat}:${originLng}:${destLat}:${destLng}`;
  
  // Check cache
  const cached = await checkCache(cacheKey);
  if (cached) return res.json(cached);
  
  // Get polylines
  const polylines = routes || await fetchRoutes(originLat, originLng, destLat, destLng);
  
  // Score routes
  const scoredRoutes = await Promise.all(
    polylines.map((polyline, index) => calculateRoutePES(index + 1, polyline))
  );
  
  // Sort and cache
  scoredRoutes.sort((a, b) => a.pes - b.pes);
  await cacheResult(cacheKey, scoredRoutes);
  
  res.json(scoredRoutes);
});
```

### 3. Cache Key Generation

**Purpose:** Generate unique, deterministic cache keys for route-based requests

**Strategy:** Hash the route data to create a stable key

**Implementation:**
```javascript
import crypto from 'crypto';

function generateRouteCacheKey(routes) {
  // Serialize routes to JSON and hash
  const routeString = JSON.stringify(routes);
  const hash = crypto.createHash('sha256').update(routeString).digest('hex');
  return `route:custom:${hash}`;
}
```

**Rationale:**
- SHA-256 ensures collision resistance
- Deterministic: same routes always produce same key
- Prefix `route:custom:` distinguishes from coordinate-based keys
- Compact: 64-character hex string vs potentially large route data

### 4. Coordinate Validation Adjustment

**File:** `src/middleware/validateCoordinates.js` (MODIFIED)

**Change:** Make coordinate validation conditional

**Current Behavior:** Always validates coordinates

**New Behavior:** 
- If `routes` is provided: coordinates are optional (may be used for metadata/logging)
- If `routes` is NOT provided: coordinates are required (existing behavior)

**Modification:**
```javascript
export function validateCoordinates(req, res, next) {
  const { originLat, originLng, destLat, destLng, routes } = req.body;
  
  // If routes are provided, coordinates are optional
  if (routes !== undefined) {
    return next();
  }
  
  // Existing validation logic for coordinate-based requests
  // ... (unchanged)
}
```

## Data Models

### Request Body Schema

**Coordinate-based Request (existing):**
```typescript
{
  originLat: number,    // Required, range: [22.5, 22.9]
  originLng: number,    // Required, range: [88.2, 88.6]
  destLat: number,      // Required, range: [22.5, 22.9]
  destLng: number,      // Required, range: [88.2, 88.6]
}
```

**Route-based Request (new):**
```typescript
{
  originLat?: number,   // Optional when routes provided
  originLng?: number,   // Optional when routes provided
  destLat?: number,     // Optional when routes provided
  destLng?: number,     // Optional when routes provided
  routes: Array<Array<[number, number]>>  // Array of polylines
}
```

**Polyline Format:**
```typescript
type Coordinate = [number, number];  // [longitude, latitude]
type Polyline = Coordinate[];        // Array of coordinates
type Routes = Polyline[];            // Array of polylines
```

**Example:**
```json
{
  "originLat": 22.5726,
  "originLng": 88.3639,
  "destLat": 22.5958,
  "destLng": 88.4026,
  "routes": [
    [
      [88.3639, 22.5726],
      [88.3700, 22.5750],
      [88.3800, 22.5850],
      [88.4026, 22.5958]
    ],
    [
      [88.3639, 22.5726],
      [88.3650, 22.5800],
      [88.3900, 22.5900],
      [88.4026, 22.5958]
    ]
  ]
}
```

### Response Schema

**Unchanged:** Response format remains identical regardless of route source

```typescript
{
  routeId: string,      // "route-1", "route-2", etc.
  polyline: Coordinate[],
  pes: number           // Pollution Exposure Score (integer)
}[]
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Before defining the correctness properties, I need to analyze the acceptance criteria for testability:


### Property Reflection

After analyzing the acceptance criteria, I identified the following redundancies:

**Redundancy 1:** Properties 1.2 and 5.3 are identical - both test that omitting routes triggers OpenRouteService fetch. These should be combined into a single property.

**Redundancy 2:** Properties 2.5 and 2.6 both test coordinate range validation. These can be combined into a single property that validates all coordinate bounds.

**Redundancy 3:** Properties 1.1 and 1.4 both test that provided routes are used instead of fetching. Property 1.4 is more specific (includes coordinates), so 1.1 is subsumed by 1.4.

**Redundancy 4:** Property 5.1 is a general backward compatibility statement that is validated by the combination of properties 1.2 and 5.2. It doesn't add unique validation value.

After eliminating redundancies, the following properties remain:

### Property 1: Route Precedence

*For any* request containing a valid `routes` field, the system should use the provided routes and skip the OpenRouteService API call, regardless of whether coordinates are also provided.

**Validates: Requirements 1.1, 1.4**

### Property 2: Default Route Fetching

*For any* request without a `routes` field, the system should fetch routes from OpenRouteService using the provided coordinates.

**Validates: Requirements 1.2, 5.3**

### Property 3: Valid Route Structure Acceptance

*For any* properly structured routes array (array of polylines, where each polyline is an array of [longitude, latitude] coordinate pairs with valid numbers), the system should accept and process the request.

**Validates: Requirements 1.3**

### Property 4: Route Type Validation

*For any* request where the `routes` field is not an array, the system should return a 400 error indicating type mismatch.

**Validates: Requirements 2.1**

### Property 5: Route Element Structure Validation

*For any* routes array containing elements that are not arrays of coordinate pairs, the system should return a 400 error with details about the invalid structure.

**Validates: Requirements 2.2, 2.3**

### Property 6: Coordinate Range Validation

*For any* coordinate pair where longitude is outside [-180, 180] or latitude is outside [-90, 90], the system should return a 400 error indicating the out-of-range value.

**Validates: Requirements 2.5, 2.6**

### Property 7: PES Calculation Consistency

*For any* polyline, the PES calculation algorithm should produce identical results regardless of whether the polyline came from OpenRouteService or was provided by the client.

**Validates: Requirements 3.1**

### Property 8: Response Format Consistency

*For any* valid request (coordinate-based or route-based), the response should conform to the same schema: an array of objects with `routeId`, `polyline`, and `pes` fields.

**Validates: Requirements 3.2**

### Property 9: PES Sorting Invariant

*For any* set of scored routes, the returned array should be sorted in ascending order by PES value (lowest pollution exposure first).

**Validates: Requirements 3.3**

### Property 10: Route-Based Cache Key Uniqueness

*For any* two different route datasets, the generated cache keys should be different, ensuring cache isolation between distinct route requests.

**Validates: Requirements 4.1**

### Property 11: Coordinate-Based Cache Key Stability

*For any* coordinate-only request, the cache key format should match the existing pattern `route:${originLat}:${originLng}:${destLat}:${destLng}`.

**Validates: Requirements 4.2**

### Property 12: Cache Round-Trip

*For any* valid request, if the result is cached and the same request is made again within the TTL window, the cached result should be returned without recalculation.

**Validates: Requirements 4.3**

### Property 13: Coordinate Validation for Legacy Requests

*For any* request without a `routes` field, invalid coordinates (missing, non-numeric, same origin/destination, or outside Kolkata bounds) should be rejected with a 400 error.

**Validates: Requirements 5.2**

## Error Handling

### Error Categories

**1. Validation Errors (400 Bad Request)**

- Missing required coordinates (when routes not provided)
- Invalid coordinate types or values
- Invalid route structure
- Empty routes array
- Out-of-range coordinates
- Same origin and destination (when routes not provided)
- Coordinates outside Kolkata bounds (when routes not provided)

**2. External Service Errors (500 Internal Server Error)**

- OpenRouteService API failure
- Database connection errors
- Redis cache errors (non-fatal, logged but not blocking)

**3. Processing Errors (500 Internal Server Error)**

- PES calculation failures
- Unexpected data format from external services

### Error Response Format

All errors follow a consistent JSON structure:

```json
{
  "error": "Human-readable error message",
  "details": "Additional context (optional)",
  "received": "The invalid value that caused the error (optional)"
}
```

### Error Handling Strategy

**Graceful Degradation:**
- Redis cache failures are logged but don't block requests
- Missing environmental data (AQI, weather, traffic) uses safe defaults
- System continues operating with reduced functionality rather than failing completely

**Fail-Fast Validation:**
- Input validation happens early in the request pipeline
- Invalid requests are rejected before expensive operations (API calls, DB queries)
- Clear error messages guide clients to fix issues

**Retry Logic:**
- External API calls (OpenRouteService) include timeout configuration (10 seconds)
- No automatic retries to avoid cascading delays
- Clients should implement their own retry logic with exponential backoff

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests** focus on:
- Specific examples of valid and invalid route structures
- Edge cases (empty arrays, single-point routes, boundary coordinates)
- Error message formatting and HTTP status codes
- Cache key generation for known inputs
- Integration between middleware and route handler

**Property-Based Tests** focus on:
- Universal properties that hold for all inputs
- Validation logic across randomly generated route data
- PES calculation consistency across diverse polylines
- Cache behavior with varied route structures
- Sorting invariants with random PES values

### Property-Based Testing Configuration

**Library:** `fast-check` (JavaScript property-based testing library)

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with feature name and property reference
- Tag format: `Feature: dynamic-route-input, Property {number}: {property_text}`

**Example Test Structure:**
```javascript
import fc from 'fast-check';

// Feature: dynamic-route-input, Property 1: Route Precedence
test('provided routes are used instead of fetching from OpenRouteService', () => {
  fc.assert(
    fc.property(
      fc.array(validPolylineArbitrary(), { minLength: 1, maxLength: 5 }),
      async (routes) => {
        const mockFetch = jest.fn();
        const response = await scoreEndpoint({ routes }, { fetchRoutes: mockFetch });
        
        expect(mockFetch).not.toHaveBeenCalled();
        expect(response.status).toBe(200);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Test Coverage Requirements

**Minimum Coverage Targets:**
- Line coverage: 90%
- Branch coverage: 85%
- Function coverage: 95%

**Critical Paths (100% coverage required):**
- Route validation logic
- Cache key generation
- Route source detection (provided vs fetched)
- PES calculation algorithm

### Integration Testing

**Test Scenarios:**
1. End-to-end flow with provided routes
2. End-to-end flow with coordinate-based fetching
3. Cache hit and miss scenarios
4. Concurrent requests with same route data
5. Mixed requests (some with routes, some without)

**Test Environment:**
- Mock OpenRouteService API responses
- Use test Redis instance (separate from production)
- Use test database with known environmental data
- Isolated test runs to avoid cache pollution

### Performance Testing

**Benchmarks:**
- Route validation should complete in <5ms for typical payloads
- Cache key generation should complete in <1ms
- End-to-end request (cache miss) should complete in <2 seconds
- End-to-end request (cache hit) should complete in <50ms

**Load Testing:**
- System should handle 100 concurrent requests without degradation
- Cache should effectively reduce database load by >80% for repeated requests
- Memory usage should remain stable under sustained load

## Implementation Notes

### Migration Strategy

**Phase 1: Add New Functionality**
1. Create `validateRoutes.js` middleware
2. Add route validation logic to score handler
3. Implement cache key generation for route-based requests
4. Add unit tests for new validation logic

**Phase 2: Integration**
1. Modify `score.js` to conditionally apply route validation
2. Update cache key logic to handle both request types
3. Add integration tests for both request types
4. Update API documentation

**Phase 3: Validation**
1. Deploy to staging environment
2. Run property-based tests against staging
3. Perform load testing
4. Monitor cache hit rates and response times

**Phase 4: Production Rollout**
1. Deploy to production with feature flag (if available)
2. Monitor error rates and performance metrics
3. Gradually increase traffic to new code path
4. Full rollout after 48 hours of stable operation

### Backward Compatibility Checklist

- [ ] Existing coordinate-only requests work without modification
- [ ] Cache keys for coordinate-only requests remain unchanged
- [ ] Response format is identical for both request types
- [ ] Error messages for coordinate validation are unchanged
- [ ] Performance characteristics are similar or better
- [ ] Existing tests continue to pass

### Security Considerations

**Input Validation:**
- Strict validation of route structure prevents injection attacks
- Coordinate range validation prevents geographic boundary violations
- Array size limits prevent memory exhaustion attacks

**Recommended Limits:**
- Maximum routes per request: 10
- Maximum points per polyline: 1000
- Maximum request body size: 1MB

**Rate Limiting:**
- Apply existing rate limiting to both request types
- Consider separate limits for route-based requests (more expensive to process)

### Monitoring and Observability

**Metrics to Track:**
- Request count by type (coordinate-based vs route-based)
- Cache hit rate by request type
- Average response time by request type
- Validation error rate by error type
- OpenRouteService API call rate (should decrease with route-based requests)

**Logging:**
- Log route source (provided vs fetched) for each request
- Log cache key generation time
- Log validation failures with sanitized input samples
- Log OpenRouteService API failures

**Alerts:**
- Alert if validation error rate exceeds 10%
- Alert if cache hit rate drops below 50%
- Alert if average response time exceeds 3 seconds
- Alert if OpenRouteService API error rate exceeds 5%

## Future Enhancements

### Potential Improvements

1. **Route Validation Enhancements:**
   - Validate that routes stay within Kolkata bounds
   - Check for reasonable route lengths (not too short or too long)
   - Validate that polylines form connected paths

2. **Cache Optimization:**
   - Implement cache warming for popular routes
   - Add cache statistics endpoint for monitoring
   - Support cache invalidation API for manual cache clearing

3. **Performance Optimization:**
   - Batch database queries for multiple routes
   - Implement request coalescing for identical concurrent requests
   - Add response compression for large route datasets

4. **API Enhancements:**
   - Support route metadata (name, description, source)
   - Return confidence scores for PES calculations
   - Add optional detailed breakdown of PES components per segment

5. **Developer Experience:**
   - Add request/response examples to API documentation
   - Provide client libraries for common languages
   - Create interactive API playground for testing

## Conclusion

This design enables flexible route scoring while maintaining full backward compatibility with existing clients. The dual-path architecture (coordinate-based vs route-based) is clean, testable, and performant. Property-based testing ensures correctness across the infinite space of possible route inputs, while unit tests validate specific edge cases and error conditions.

The implementation prioritizes:
- **Backward compatibility:** Existing clients continue working without changes
- **Validation rigor:** Comprehensive input validation prevents invalid data from entering the system
- **Performance:** Caching strategy handles both request types efficiently
- **Maintainability:** Clear separation of concerns between validation, caching, and scoring logic
- **Testability:** Property-based tests provide high confidence in correctness
