import { sampleSegments } from "./segmentSampler.js";
import {
  calculateTrafficWeight,
  calculateWindFactor,
  calculateTimeInSegment,
} from "./weightFactors.js";

export async function calculateRoutePES(routeIndex, polyline) {
  // 1. Get enriched segments from segmentSampler
  const enrichedSegments = await sampleSegments(polyline);

  let routePes = 0;

  // 2. Iterate each segment and calculate weights
  for (const seg of enrichedSegments) {
    // Default safe baseline values if no data from DB within 500m
    const aqiParam = seg.aqi?.pm25 || 25.0; // Assume moderate PM25 as baseline

    let trafficWeight = 1.0;
    if (seg.traffic) {
      trafficWeight = calculateTrafficWeight(
        seg.traffic.free_flow_speed,
        seg.traffic.current_speed,
      );
    }

    let windFactor = 1.0;
    if (seg.weather && seg.weather.wind_deg) {
      windFactor = calculateWindFactor(seg.bearing, seg.weather.wind_deg);
    }

    const timeInSegment = calculateTimeInSegment(seg.distanceMeters, 15); // Assume 15kmh / cyclist

    // 3. Apply formula
    const segmentPes = aqiParam * trafficWeight * windFactor * timeInSegment;
    routePes += segmentPes;
  }

  return {
    routeId: `route-${routeIndex}`,
    polyline,
    pes: Math.round(routePes),
  };
}
