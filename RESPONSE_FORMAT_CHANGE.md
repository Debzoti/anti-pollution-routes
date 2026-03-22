# Response Format Change Summary

## What Changed

The `/api/score` endpoint now returns an **object** instead of a plain **array**.

### Before (Old Format)
```json
[
  {
    "routeId": 1,
    "pes": 42.15,
    "distance": 14230,
    ...
  },
  {
    "routeId": 2,
    "pes": 45.89,
    ...
  }
]
```

### After (New Format)
```json
{
  "success": true,
  "count": 2,
  "routes": [
    {
      "routeId": 1,
      "pes": 42.15,
      "distance": 14230,
      ...
    },
    {
      "routeId": 2,
      "pes": 45.89,
      ...
    }
  ]
}
```

## New Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` for successful responses |
| `count` | number | Number of routes returned |
| `routes` | array | Array of route objects (sorted by PES) |

## Why This Change?

1. **Standard REST API pattern** - Most APIs return objects, not arrays
2. **Extensible** - Easy to add metadata (timestamp, version, pagination, etc.)
3. **Self-documenting** - `count` field shows number of routes
4. **Consistent** - Error responses already return objects
5. **Future-proof** - Can add filters, sorting options, etc. without breaking changes

## Files Modified

- `src/routes/score.js` - Changed response format
- `test-coordinate-cache-logging.js` - Updated to use new format
- `test-new-response-format.js` - New test to verify format

## Testing

### Run Format Verification Test
```bash
node test-new-response-format.js
```

This test verifies:
- Response is an object (not array)
- Has `success`, `count`, and `routes` fields
- `count` matches `routes.length`
- Routes are sorted by PES (ascending)

### Manual Testing with Postman

**Request:**
```json
POST http://localhost:3000/api/score
{
  "originLat": 19.0760,
  "originLng": 72.8777,
  "destLat": 19.1176,
  "destLng": 72.9060
}
```

**Expected Response:**
```json
{
  "success": true,
  "count": 3,
  "routes": [
    { "routeId": 1, "pes": 42.15, ... },
    { "routeId": 2, "pes": 45.89, ... },
    { "routeId": 3, "pes": 48.23, ... }
  ]
}
```

## Frontend Migration Required

⚠️ **BREAKING CHANGE** - Frontend code needs to be updated!

### Before (Old Code)
```javascript
const response = await axios.post('/api/score', requestBody);
const routes = response.data; // Array
const bestRoute = routes[0];
const routeCount = routes.length;
```

### After (New Code)
```javascript
const response = await axios.post('/api/score', requestBody);
const { success, count, routes } = response.data; // Object
const bestRoute = routes[0];
const routeCount = count; // or routes.length
```

### Quick Fix
```javascript
// Destructure to get routes array
const { routes } = response.data;

// Now use routes as before
const bestRoute = routes[0];
```

## Cache Compatibility

The cache now stores the new format:
- Cache key remains the same
- Cached value is the full response object (not just routes array)
- No cache invalidation needed - old cache entries will expire naturally (1 hour TTL)

## Error Responses

Error responses remain unchanged (already return objects):
```json
{
  "error": "Failed to score routes",
  "details": "No routes found from Ola Maps API"
}
```

## Rollback Plan

If needed, revert with:
```bash
git revert <commit-hash>
```

Or manually change in `src/routes/score.js`:
```javascript
// Change this:
res.json(response);

// Back to this:
res.json(scoredRoutes);
```

## Next Steps

1. ✅ Backend updated to new format
2. ⏳ Test with `node test-new-response-format.js`
3. ⏳ Update frontend code to use `response.data.routes`
4. ⏳ Update any API documentation
5. ⏳ Notify frontend team of breaking change
