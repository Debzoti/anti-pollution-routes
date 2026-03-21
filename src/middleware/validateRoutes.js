// Route validation limits aligned with OpenRouteService API
const LIMITS = {
  MAX_ROUTES: 3,              // Match OpenRouteService alternative_routes limit
  MAX_POINTS_PER_ROUTE: 500,  // Reasonable for city routes (prevents DB overload)
  MAX_TOTAL_POINTS: 1000      // Total cap across all routes
};

/**
 * Middleware to validate route polyline data structure
 * Validates that routes is an array of polylines where each polyline
 * is an array of [longitude, latitude] coordinate pairs
 * Enforces size limits to prevent performance issues and API abuse
 */
export function validateRoutes(req, res, next) {
  const { routes } = req.body;

  // If routes is not provided, skip validation (handled by other middleware)
  if (routes === undefined) {
    return next();
  }

  // Validate that routes is an array
  if (!Array.isArray(routes)) {
    return res.status(400).json({
      error: "routes must be an array",
      received: typeof routes
    });
  }

  // Validate that routes array is not empty
  if (routes.length === 0) {
    return res.status(400).json({
      error: "At least one route is required",
      received: []
    });
  }

  // Enforce maximum number of routes (aligned with OpenRouteService)
  if (routes.length > LIMITS.MAX_ROUTES) {
    return res.status(400).json({
      error: `Too many routes. Maximum ${LIMITS.MAX_ROUTES} routes allowed`,
      received: routes.length,
      hint: "This limit matches OpenRouteService API behavior"
    });
  }

  let totalPoints = 0;

  // Validate each route structure
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];

    // Each route must be an array
    if (!Array.isArray(route)) {
      return res.status(400).json({
        error: `Invalid route structure at index ${i}`,
        details: "Each route must be an array of [longitude, latitude] pairs",
        received: typeof route
      });
    }

    // Validate minimum points per route (at least start and end)
    if (route.length < 2) {
      return res.status(400).json({
        error: `Route ${i} has too few points`,
        details: "Each route must have at least 2 points (start and end)",
        received: route.length
      });
    }

    // Enforce maximum points per route
    if (route.length > LIMITS.MAX_POINTS_PER_ROUTE) {
      return res.status(400).json({
        error: `Route ${i} has too many points`,
        details: `Maximum ${LIMITS.MAX_POINTS_PER_ROUTE} points per route`,
        received: route.length,
        hint: "Consider simplifying the route polyline"
      });
    }

    totalPoints += route.length;

    // Validate each coordinate pair in the route
    for (let j = 0; j < route.length; j++) {
      const coord = route[j];

      // Coordinate must be an array
      if (!Array.isArray(coord)) {
        return res.status(400).json({
          error: `Invalid coordinate at route ${i}, point ${j}`,
          details: "Expected [longitude, latitude] where both are numbers",
          received: coord
        });
      }

      // Coordinate must have exactly 2 elements
      if (coord.length !== 2) {
        return res.status(400).json({
          error: `Invalid coordinate at route ${i}, point ${j}`,
          details: "Expected [longitude, latitude] with exactly 2 elements",
          received: coord
        });
      }

      const [lng, lat] = coord;

      // Both longitude and latitude must be numbers
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        return res.status(400).json({
          error: `Invalid coordinate at route ${i}, point ${j}`,
          details: "Expected [longitude, latitude] where both are numbers",
          received: coord
        });
      }

      // Check for NaN or Infinity
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        return res.status(400).json({
          error: `Invalid coordinate at route ${i}, point ${j}`,
          details: "Coordinates must be finite numbers (not NaN or Infinity)",
          received: [lng, lat]
        });
      }

      // Validate longitude range [-180, 180]
      if (lng < -180 || lng > 180) {
        return res.status(400).json({
          error: `Coordinate out of range at route ${i}, point ${j}`,
          details: "Longitude must be between -180 and 180",
          received: [lng, lat]
        });
      }

      // Validate latitude range [-90, 90]
      if (lat < -90 || lat > 90) {
        return res.status(400).json({
          error: `Coordinate out of range at route ${i}, point ${j}`,
          details: "Latitude must be between -90 and 90",
          received: [lng, lat]
        });
      }
    }
  }

  // Enforce total points limit across all routes
  if (totalPoints > LIMITS.MAX_TOTAL_POINTS) {
    return res.status(400).json({
      error: "Too many total points across all routes",
      details: `Maximum ${LIMITS.MAX_TOTAL_POINTS} total points allowed`,
      received: totalPoints,
      hint: "Reduce the number of routes or simplify the polylines"
    });
  }

  // All validation passed
  next();
}
