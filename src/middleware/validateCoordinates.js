// Service area bounding boxes for supported cities
const SERVICE_AREAS = {
  MUMBAI: {
    minLat: 18.9,
    maxLat: 19.3,
    minLng: 72.7,
    maxLng: 73.0
  },
  DELHI: {
    minLat: 28.4,
    maxLat: 28.9,
    minLng: 76.8,
    maxLng: 77.4
  },
  KOLKATA: {
    minLat: 22.4,
    maxLat: 22.9,
    minLng: 88.2,
    maxLng: 88.6
  }
};

function isWithinServiceArea(lat, lng) {
  // Check if coordinates fall within any supported city
  for (const [city, bounds] of Object.entries(SERVICE_AREAS)) {
    if (lat >= bounds.minLat && 
        lat <= bounds.maxLat && 
        lng >= bounds.minLng && 
        lng <= bounds.maxLng) {
      return { valid: true, city };
    }
  }
  return { valid: false, city: null };
}

/**
 * Middleware to validate route coordinates
 * Checks: missing fields, type validation, same origin/dest
 * If routes are provided in the request body, coordinate validation is skipped
 * 
 * Note: Geographic bounds are NOT enforced here to support multiple cities.
 * The system will return an error during scoring if no environmental data is available.
 */
export function validateCoordinates(req, res, next) {
  const { originLat, originLng, destLat, destLng, routes } = req.body;

  // If routes are provided, skip coordinate validation
  if (routes !== undefined) {
    return next();
  }

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

  // 3. Validate coordinate ranges
  if (originLng < -180 || originLng > 180 || destLng < -180 || destLng > 180) {
    return res.status(400).json({ 
      error: "Longitude must be between -180 and 180",
      received: { originLng, destLng }
    });
  }

  if (originLat < -90 || originLat > 90 || destLat < -90 || destLat > 90) {
    return res.status(400).json({ 
      error: "Latitude must be between -90 and 90",
      received: { originLat, destLat }
    });
  }

  // 4. Check if origin and destination are the same
  if (originLat === destLat && originLng === destLng) {
    return res.status(400).json({ 
      error: "Origin and destination cannot be the same",
      coordinates: { lat: originLat, lng: originLng }
    });
  }

  // 4. Validate coordinates are within service areas
  const originCheck = isWithinServiceArea(originLat, originLng);
  if (!originCheck.valid) {
    return res.status(400).json({ 
      error: "Origin is outside supported service areas",
      supportedCities: Object.keys(SERVICE_AREAS),
      bounds: SERVICE_AREAS,
      received: { lat: originLat, lng: originLng }
    });
  }

  const destCheck = isWithinServiceArea(destLat, destLng);
  if (!destCheck.valid) {
    return res.status(400).json({ 
      error: "Destination is outside supported service areas",
      supportedCities: Object.keys(SERVICE_AREAS),
      bounds: SERVICE_AREAS,
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
  const originCheck = isWithinServiceArea(coords.originLat, coords.originLng);
  if (!originCheck.valid) {
    return res.status(400).json({ 
      error: "Origin is outside supported service areas",
      supportedCities: Object.keys(SERVICE_AREAS),
      bounds: SERVICE_AREAS,
      received: { lat: coords.originLat, lng: coords.originLng }
    });
  }

  const destCheck = isWithinServiceArea(coords.destLat, coords.destLng);
  if (!destCheck.valid) {
    return res.status(400).json({ 
      error: "Destination is outside supported service areas",
      supportedCities: Object.keys(SERVICE_AREAS),
      bounds: SERVICE_AREAS,
      received: { lat: coords.destLat, lng: coords.destLng }
    });
  }

  // Attach parsed coordinates to request for downstream use
  req.coordinates = coords;

  // All validations passed
  next();
}
