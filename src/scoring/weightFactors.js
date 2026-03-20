// Pure functions for weighting the PES values

export function calculateTrafficWeight(freeFlowSpeed, currentSpeed) {
  // congested road = higher number
  if (!freeFlowSpeed || !currentSpeed || currentSpeed === 0) return 1.0;
  return freeFlowSpeed / currentSpeed;
}

export function calculateWindFactor(travelBearing, windDirection) {
  // Angle between travel and wind direction
  // A direct headwind means the difference is near 180 degrees.
  // But wait! If wind is coming FROM 180 and we go TO 180, it's a tailwind.
  // We'll calculate angular divergence. Max divergence = 180.
  // Headwind = 180 difference, factor should be higher (e.g., 1.5). Tailwind = 0 diff, factor 0.5.
  if (windDirection == null || travelBearing == null) return 1.0;

  const diff = Math.abs(((windDirection - travelBearing + 180) % 360) - 180);

  // Diff is between 0 and 180.
  // Let's make it a multiplier from 0.8 (tailwind) to 1.5 (headwind)
  // This is a simple linear map: 0->0.8, 180->1.5
  return 0.8 + (diff / 180) * 0.7;
}

export function calculateTimeInSegment(distanceMeters, travelSpeedKmh = 15) {
  // bicycle avg speed ~ 15km/h = 4.16 m/s
  const speedMs = (travelSpeedKmh * 1000) / 3600;
  return distanceMeters / speedMs; // Time in seconds
}
