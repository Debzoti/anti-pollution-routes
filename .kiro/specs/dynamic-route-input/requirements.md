# Requirements Document

## Introduction

This feature enables the frontend to optionally provide their own route polyline data instead of requiring the backend to fetch routes from OpenRouteService. This addresses the restriction on using the HERE API and allows frontend teams to test with dynamic route data during development.

## Glossary

- **Score_Endpoint**: The POST /score API endpoint that calculates pollution exposure scores for routes
- **Route_Polyline**: An array of coordinate pairs [longitude, latitude] representing a route path
- **OpenRouteService**: External API currently used to fetch alternative routes between origin and destination
- **PES_Calculator**: The system component that calculates Pollution Exposure Score for a given route polyline
- **Frontend_Client**: The client application that consumes the Score_Endpoint

## Requirements

### Requirement 1: Accept Optional Route Data

**User Story:** As a frontend developer, I want to optionally provide my own route polylines to the /score endpoint, so that I can test route scoring without depending on external routing APIs.

#### Acceptance Criteria

1. WHEN the Frontend_Client sends a request with a "routes" field containing route polylines, THE Score_Endpoint SHALL use the provided polylines instead of calling OpenRouteService
2. WHEN the Frontend_Client sends a request without a "routes" field, THE Score_Endpoint SHALL fetch routes from OpenRouteService using the provided coordinates
3. THE Score_Endpoint SHALL accept routes as an array of polylines where each polyline is an array of [longitude, latitude] coordinate pairs
4. WHEN the Frontend_Client provides both coordinates and routes, THE Score_Endpoint SHALL prioritize the provided routes over fetching from OpenRouteService

### Requirement 2: Validate Route Data Structure

**User Story:** As a backend developer, I want to validate incoming route data, so that the system processes only well-formed route polylines.

#### Acceptance Criteria

1. WHEN the Frontend_Client provides a "routes" field, THE Score_Endpoint SHALL validate that it is an array
2. WHEN the "routes" array contains elements, THE Score_Endpoint SHALL validate that each element is an array of coordinate pairs
3. WHEN a coordinate pair is invalid (not a two-element array of numbers), THE Score_Endpoint SHALL return a 400 error with a descriptive message
4. WHEN the "routes" array is empty, THE Score_Endpoint SHALL return a 400 error indicating at least one route is required
5. WHEN longitude values are outside the range [-180, 180], THE Score_Endpoint SHALL return a 400 error
6. WHEN latitude values are outside the range [-90, 90], THE Score_Endpoint SHALL return a 400 error

### Requirement 3: Calculate PES for Provided Routes

**User Story:** As a frontend developer, I want my provided routes to be scored using the same PES calculation logic, so that I get consistent results regardless of route source.

#### Acceptance Criteria

1. WHEN the Frontend_Client provides route polylines, THE PES_Calculator SHALL calculate pollution exposure scores using the same algorithm as OpenRouteService-fetched routes
2. THE Score_Endpoint SHALL return scored routes in the same response format regardless of whether routes were provided or fetched
3. THE Score_Endpoint SHALL sort returned routes by PES in ascending order (lowest pollution first)
4. WHEN multiple routes are provided, THE Score_Endpoint SHALL score all routes in parallel

### Requirement 4: Maintain Cache Compatibility

**User Story:** As a system operator, I want route scoring results to be cached appropriately, so that repeated requests are served efficiently.

#### Acceptance Criteria

1. WHEN the Frontend_Client provides custom routes, THE Score_Endpoint SHALL generate a unique cache key based on the route data
2. WHEN the Frontend_Client requests routes using coordinates only, THE Score_Endpoint SHALL use the existing coordinate-based cache key
3. WHEN a cached result exists for provided route data, THE Score_Endpoint SHALL return the cached result
4. THE Score_Endpoint SHALL set cache expiration to 1 hour for all cached results

### Requirement 5: Maintain Backward Compatibility

**User Story:** As a frontend developer using the existing API, I want my current implementation to continue working without changes, so that I don't need to update my code immediately.

#### Acceptance Criteria

1. WHEN the Frontend_Client sends a request using only the existing coordinate fields (originLat, originLng, destLat, destLng), THE Score_Endpoint SHALL function exactly as before
2. THE Score_Endpoint SHALL continue to require coordinate validation for requests without provided routes
3. WHEN the Frontend_Client omits the "routes" field, THE Score_Endpoint SHALL fetch routes from OpenRouteService as the default behavior
