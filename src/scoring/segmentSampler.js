import pool from '../db/client.js';
import { 
  NEAREST_AQI_POSTGIS, 
  NEAREST_WEATHER_POSTGIS, 
  NEAREST_TRAFFIC_POSTGIS 
} from '../db/queries.js';

// Haversine formula to calculate distance in meters between two lat/lng points
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Calculate bearing from pt1 to pt2
function getBearing(lat1, lon1, lat2, lon2) {
  const p1 = lat1 * Math.PI/180, p2 = lat2 * Math.PI/180, dl = (lon2-lon1) * Math.PI/180;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1)*Math.sin(p2) - Math.sin(p1)*Math.cos(p2)*Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/**
 * Samples a polyline to find the nearest AQI, Weather, and Traffic for each segment.
 * Expects polyline: [[lng1, lat1], [lng2, lat2], ...]
 */
export async function sampleSegments(polyline) {
  const segments = [];

  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i];     // [lng, lat]
    const p2 = polyline[i + 1];

    const midLng = (p1[0] + p2[0]) / 2;
    const midLat = (p1[1] + p2[1]) / 2;

    const distanceMeters = getDistanceMeters(p1[1], p1[0], p2[1], p2[0]);
    const bearing = getBearing(p1[1], p1[0], p2[1], p2[0]);

    // Query TimescaleDB PostGIS
    // Wait, PG uses $1, $2, so we pass [midLng, midLat]
    const [aqiRes, weatherRes, trafficRes] = await Promise.all([
      pool.query(NEAREST_AQI_POSTGIS, [midLng, midLat]),
      pool.query(NEAREST_WEATHER_POSTGIS, [midLng, midLat]),
      pool.query(NEAREST_TRAFFIC_POSTGIS, [midLng, midLat])
    ]);

    segments.push({
      start: p1,
      end: p2,
      midpoint: [midLng, midLat],
      distanceMeters,
      bearing,
      aqi: aqiRes.rows[0] || null,
      weather: weatherRes.rows[0] || null,
      traffic: trafficRes.rows[0] || null
    });
  }

  return segments;
}
