// Kolkata bounding box: approximately 22.5°N to 22.9°N, 88.2°E to 88.6°E
const KOLKATA_BOUNDS = {
  minLat: 22.5,
  maxLat: 22.9,
  minLng: 88.2,
  maxLng: 88.6
};

function isWithinKolkata(lat, lng) {
  return lat >= KOLKATA_BOUNDS.minLat && 
         lat <= KOLKATA_BOUNDS.maxLat && 
         lng >= KOLKATA_BOUNDS.minLng && 
         lng <= KOLKATA_BOUNDS.maxLng;
}

/**
 * Middleware to validate route coordinates
 * Checks: missing fields, type validation, bounds, same origin/dest
 */
export function validateCoordinates(req, res, next) {
  const { originLat, originLng, destLat, destLng } = req.body;

  // 1. Check for missing fields
  if (originLat == null || originLng == null || destLat == null || destLng == null) {
    return res.status(400).json({ 
      error: "Missing origin or destination coordinates",
      required: ["originLat", "originLng", "destLat", "destLng"]
    });
  }

  // 2. Validate coordinates are numbers
  const coords = [originLat, originLng, destLat, destLng];
  if (coords.some(c => typeof c !== 'number' || isNaN(c))) {
    return res.status(400).json({ 
      error: "Coordinates must be valid numbers",
      received: { originLat, originLng, destLat, destLng }
    });
  }

  // 3. Check if origin and destination are the same
  if (originLat === destLat && originLng === destLng) {
    return res.status(400).json({ 
      error: "Origin and destination cannot be the same",
      coordinates: { lat: originLat, lng: originLng }
    });
  }

  // 4. Validate coordinates are within Kolkata bounding box
  if (!isWithinKolkata(originLat, originLng)) {
    return res.status(400).json({ 
      error: "Origin is outside Kolkata service area",
      bounds: KOLKATA_BOUNDS,
      received: { lat: originLat, lng: originLng }
    });
  }

  if (!isWithinKolkata(destLat, destLng)) {
    return res.status(400).json({ 
      error: "Destination is outside Kolkata service area",
      bounds: KOLKATA_BOUNDS,
      received: { lat: destLat, lng: destLng }
    });
  }

  // All validations passed
  next();
}

/**
 * Middleware to validate query parameters for SSE endpoint
 */
export function validateQueryCoordinates(req, res, next) {
  const { originLat, originLng, destLat, destLng } = req.query;

  // 1. Check for missing fields
  if (!originLat || !originLng || !destLat || !destLng) {
    return res.status(400).json({ 
      error: "Missing route coordinates in query parameters",
      required: ["originLat", "originLng", "destLat", "destLng"]
    });
  }

  // 2. Parse and validate as numbers
  const coords = {
    originLat: parseFloat(originLat),
    originLng: parseFloat(originLng),
    destLat: parseFloat(destLat),
    destLng: parseFloat(destLng)
  };

  if (Object.values(coords).some(c => isNaN(c))) {
    return res.status(400).json({ 
      error: "Coordinates must be valid numbers",
      received: { originLat, originLng, destLat, destLng }
    });
  }

  // 3. Check if origin and destination are the same
  if (coords.originLat === coords.destLat && coords.originLng === coords.destLng) {
    return res.status(400).json({ 
      error: "Origin and destination cannot be the same",
      coordinates: { lat: coords.originLat, lng: coords.originLng }
    });
  }

  // 4. Validate bounds
  if (!isWithinKolkata(coords.originLat, coords.originLng)) {
    return res.status(400).json({ 
      error: "Origin is outside Kolkata service area",
      bounds: KOLKATA_BOUNDS,
      received: { lat: coords.originLat, lng: coords.originLng }
    });
  }

  if (!isWithinKolkata(coords.destLat, coords.destLng)) {
    return res.status(400).json({ 
      error: "Destination is outside Kolkata service area",
      bounds: KOLKATA_BOUNDS,
      received: { lat: coords.destLat, lng: coords.destLng }
    });
  }

  // Attach parsed coordinates to request for downstream use
  req.coordinates = coords;

  // All validations passed
  next();
}
