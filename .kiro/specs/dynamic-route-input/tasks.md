# Implementation Plan: Dynamic Route Input

## Overview

This implementation plan converts the design for dynamic route input into actionable coding tasks. The feature extends the `/score` endpoint to accept optional route polyline data from clients, enabling them to provide their own routes instead of relying solely on OpenRouteService. The implementation maintains full backward compatibility while adding validation, caching, and scoring for client-provided routes.

## Tasks

- [x] 1. Create route validation middleware
  - [x] 1.1 Create `src/middleware/validateRoutes.js` with validation logic
    - Implement `validateRoutes` middleware function
    - Validate that routes is an array
    - Validate each route is an array of coordinate pairs
    - Validate each coordinate pair is `[longitude, latitude]` with valid numbers
    - Validate longitude range `[-180, 180]` and latitude range `[-90, 90]`
    - Return descriptive 400 errors for validation failures
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [ ]* 1.2 Write property test for route structure validation
    - **Property 3: Valid Route Structure Acceptance**
    - **Validates: Requirements 1.3**
    - Generate random valid route structures and verify acceptance
    - _Requirements: 1.3_
  
  - [ ]* 1.3 Write property test for route type validation
    - **Property 4: Route Type Validation**
    - **Validates: Requirements 2.1**
    - Generate non-array values and verify 400 error response
    - _Requirements: 2.1_
  
  - [ ]* 1.4 Write property test for coordinate range validation
    - **Property 6: Coordinate Range Validation**
    - **Validates: Requirements 2.5, 2.6**
    - Generate out-of-range coordinates and verify 400 error response
    - _Requirements: 2.5, 2.6_
  
  - [ ]* 1.5 Write unit tests for route validation edge cases
    - Test empty routes array
    - Test single-point routes
    - Test routes with invalid coordinate pairs
    - Test error message formatting
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2. Implement cache key generation for route-based requests
  - [x] 2.1 Add cache key generation function to `src/routes/score.js`
    - Import `crypto` module
    - Implement `generateRouteCacheKey(routes)` function
    - Serialize routes to JSON string
    - Generate SHA-256 hash of serialized routes
    - Return cache key with format `route:custom:{hash}`
    - _Requirements: 4.1_
  
  - [ ]* 2.2 Write property test for cache key uniqueness
    - **Property 10: Route-Based Cache Key Uniqueness**
    - **Validates: Requirements 4.1**
    - Generate different route datasets and verify unique cache keys
    - _Requirements: 4.1_
  
  - [ ]* 2.3 Write unit tests for cache key generation
    - Test deterministic key generation (same routes produce same key)
    - Test key format matches expected pattern
    - Test hash collision resistance with similar routes
    - _Requirements: 4.1_

- [x] 3. Modify coordinate validation to be conditional
  - [x] 3.1 Update `src/middleware/validateCoordinates.js`
    - Check if `req.body.routes` is defined
    - If routes are provided, skip coordinate validation and call `next()`
    - If routes are not provided, execute existing coordinate validation logic
    - _Requirements: 5.2_
  
  - [ ]* 3.2 Write property test for coordinate validation behavior
    - **Property 13: Coordinate Validation for Legacy Requests**
    - **Validates: Requirements 5.2**
    - Generate requests without routes field and verify coordinate validation
    - _Requirements: 5.2_
  
  - [ ]* 3.3 Write unit tests for conditional validation
    - Test that validation is skipped when routes are provided
    - Test that validation runs when routes are not provided
    - Test backward compatibility with existing coordinate-only requests
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Modify score route handler to support route-based requests
  - [x] 5.1 Update `src/routes/score.js` to handle optional routes field
    - Extract `routes` from `req.body`
    - Add inline validation for routes if provided (call validation logic)
    - Implement conditional cache key generation (route-based vs coordinate-based)
    - Skip `fetchRoutes()` call when routes are provided
    - Use provided routes directly for PES calculation
    - Ensure response format is identical for both request types
    - _Requirements: 1.1, 1.2, 1.4, 3.1, 3.2, 4.1, 4.2_
  
  - [ ]* 5.2 Write property test for route precedence
    - **Property 1: Route Precedence**
    - **Validates: Requirements 1.1, 1.4**
    - Generate requests with routes field and verify OpenRouteService is not called
    - _Requirements: 1.1, 1.4_
  
  - [ ]* 5.3 Write property test for default route fetching
    - **Property 2: Default Route Fetching**
    - **Validates: Requirements 1.2, 5.3**
    - Generate requests without routes field and verify OpenRouteService is called
    - _Requirements: 1.2, 5.3_
  
  - [ ]* 5.4 Write property test for PES calculation consistency
    - **Property 7: PES Calculation Consistency**
    - **Validates: Requirements 3.1**
    - Generate polylines and verify PES calculation produces same results regardless of source
    - _Requirements: 3.1_
  
  - [ ]* 5.5 Write unit tests for score handler modifications
    - Test route-based request flow (with mocked PES calculation)
    - Test coordinate-based request flow (existing behavior)
    - Test cache key generation for both request types
    - Test error handling for invalid routes
    - _Requirements: 1.1, 1.2, 1.4, 3.1, 3.2, 4.1, 4.2_

- [x] 6. Implement response format consistency
  - [x] 6.1 Verify response format in `src/routes/score.js`
    - Ensure response includes `routeId`, `polyline`, and `pes` fields
    - Ensure routes are sorted by PES in ascending order
    - Verify format is identical for coordinate-based and route-based requests
    - _Requirements: 3.2, 3.3_
  
  - [ ]* 6.2 Write property test for response format consistency
    - **Property 8: Response Format Consistency**
    - **Validates: Requirements 3.2**
    - Generate various valid requests and verify response schema
    - _Requirements: 3.2_
  
  - [ ]* 6.3 Write property test for PES sorting invariant
    - **Property 9: PES Sorting Invariant**
    - **Validates: Requirements 3.3**
    - Generate scored routes with random PES values and verify ascending sort
    - _Requirements: 3.3_

- [x] 7. Implement cache behavior for route-based requests
  - [x] 7.1 Update caching logic in `src/routes/score.js`
    - Use route-based cache key for requests with routes field
    - Use coordinate-based cache key for requests without routes field
    - Ensure cache TTL is 1 hour (3600 seconds) for both request types
    - Handle cache errors gracefully (log but don't block)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ]* 7.2 Write property test for cache round-trip
    - **Property 12: Cache Round-Trip**
    - **Validates: Requirements 4.3**
    - Generate requests, cache results, and verify cached results are returned
    - _Requirements: 4.3_
  
  - [ ]* 7.3 Write property test for coordinate-based cache key stability
    - **Property 11: Coordinate-Based Cache Key Stability**
    - **Validates: Requirements 4.2**
    - Generate coordinate-only requests and verify cache key format
    - _Requirements: 4.2_
  
  - [ ]* 7.4 Write unit tests for cache behavior
    - Test cache hit for route-based requests
    - Test cache miss for route-based requests
    - Test cache hit for coordinate-based requests (backward compatibility)
    - Test cache key format for both request types
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Write integration tests for end-to-end flows
  - [ ]* 9.1 Write integration test for route-based request flow
    - Test complete flow: request with routes → validation → cache check → PES calculation → response
    - Verify OpenRouteService is not called
    - Verify response format and sorting
    - _Requirements: 1.1, 1.4, 3.1, 3.2, 3.3_
  
  - [ ]* 9.2 Write integration test for coordinate-based request flow
    - Test complete flow: request with coordinates → validation → cache check → fetch routes → PES calculation → response
    - Verify OpenRouteService is called
    - Verify backward compatibility
    - _Requirements: 1.2, 5.1, 5.2, 5.3_
  
  - [ ]* 9.3 Write integration test for cache behavior
    - Test cache hit scenario for route-based requests
    - Test cache hit scenario for coordinate-based requests
    - Verify cache TTL is respected
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ]* 9.4 Write integration test for error handling
    - Test validation errors for invalid routes
    - Test validation errors for invalid coordinates (when routes not provided)
    - Test graceful handling of cache errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.2_

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests use `fast-check` library with minimum 100 iterations
- Unit tests focus on specific examples and edge cases
- Integration tests validate end-to-end flows with mocked external dependencies
- Checkpoints ensure incremental validation throughout implementation
- All code should maintain backward compatibility with existing coordinate-based requests
