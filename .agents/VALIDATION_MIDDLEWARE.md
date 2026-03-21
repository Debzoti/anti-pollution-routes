# Validation Middleware

## Overview

Centralized input validation middleware for all route endpoints. Ensures consistent validation across the API.

## Location

`src/middleware/validateCoordinates.js`

## Middleware Functions

### 1. `validateCoordinates(req, res, next)`

**Used for:** POST requests with JSON body

**Validates:**
- ✅ Missing fields (originLat, originLng, destLat, destLng)
- ✅ Type checking (must be numbers, not NaN)
- ✅ Same origin and destination
- ✅ Bounding box (Kolkata: 22.5-22.9°N, 88.2-88.6°E)

**Usage:**
```javascript
import { validateCoordinates } from '../middleware/validateCoordinates.js';

router.post("/score", validateCoordinates, async (req, res) => {
  // Validation already done, coordinates are guaranteed valid
  const { originLat, originLng, destLat, destLng } = req.body;
  // ... route logic
});
```

### 2. `validateQueryCoordinates(req, res, next)`

**Used for:** GET requests with query parameters

**Validates:**
- ✅ Missing query params
- ✅ Parse strings to numbers
- ✅ Type checking (must be valid numbers)
- ✅ Same origin and destination
- ✅ Bounding box

**Bonus:** Attaches parsed coordinates to `req.coordinates`

**Usage:**
```javascript
import { validateQueryCoordinates } from '../middleware/validateCoordinates.js';

router.get("/updates", validateQueryCoordinates, (req, res) => {
  // Coordinates already parsed and validated
  const { originLat, originLng, destLat, destLng } = req.coordinates;
  // ... route logic
});
```

## Validation Rules

### 1. Missing Fields
```json
{
  "error": "Missing origin or destination coordinates",
  "required": ["originLat", "originLng", "destLat", "destLng"]
}
```

### 2. Invalid Types
```json
{
  "error": "Coordinates must be valid numbers",
  "received": { "originLat": "abc", "originLng": 88.3639, ... }
}
```

### 3. Same Origin/Destination
```json
{
  "error": "Origin and destination cannot be the same",
  "coordinates": { "lat": 22.5726, "lng": 88.3639 }
}
```

### 4. Out of Bounds
```json
{
  "error": "Origin is outside Kolkata service area",
  "bounds": {
    "minLat": 22.5,
    "maxLat": 22.9,
    "minLng": 88.2,
    "maxLng": 88.6
  },
  "received": { "lat": 28.6139, "lng": 77.2090 }
}
```

## Routes Using Middleware

### POST /api/score
```javascript
router.post("/score", validateCoordinates, async (req, res) => { ... });
```

### GET /api/updates
```javascript
router.get("/updates", validateQueryCoordinates, (req, res) => { ... });
```

## Testing

Run the validation test suite:

```bash
node test-validation-middleware.js
```

**Tests cover:**
- Valid requests
- Missing fields (all combinations)
- Invalid types (string, NaN, null)
- Same origin/destination
- Out of bounds (Delhi, Mumbai, edge cases)
- Boundary edge cases

## Benefits

✅ **DRY Principle** - Validation logic in one place
✅ **Consistency** - All routes use same validation
✅ **Maintainability** - Easy to update validation rules
✅ **Testability** - Single test suite for all validation
✅ **Error Messages** - Consistent, informative error responses
✅ **Type Safety** - Guarantees valid data reaches route handlers

## Future Enhancements

- [ ] Add distance-based validation (max route length)
- [ ] Support multiple city bounding boxes
- [ ] Rate limiting per coordinate pair
- [ ] Coordinate precision validation
- [ ] Custom error codes for each validation type
