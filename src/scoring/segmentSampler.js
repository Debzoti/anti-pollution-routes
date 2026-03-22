import { fetchAQI } from "../ingestion/fetchers/aqi.js";
import { fetchWeather } from "../ingestion/fetchers/weather.js";
import { fetchTraffic } from "../ingestion/fetchers/traffic.js";
import { normaliseAQI, normaliseWeather, normaliseTraffic } from "../ingestion/normaliser.js";
import { redisClient } from "../db/redis.js";

// Haversine formula to calculate distance in meters between two lat/lng points
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate bearing from pt1 to pt2
function getBearing(lat1, lon1, lat2, lon2) {
  const p1 = (lat1 * Math.PI) / 180,
    p2 = (lat2 * Math.PI) / 180,
    dl = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Fetch environmental data for a coordinate with coordinate-level caching.
 * Checks Redis cache first, fetches from API if not found, then caches the result.
 * This allows overlapping routes to reuse cached coordinate data.
 * 
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{aqi, weather, traffic}>} Environmental data
 */
async function fetchEnvironmentalDataWithCache(lat, lng) {
  // Round coordinates to 4 decimal places (~11m precision) for cache key
  const roundedLat = lat.toFixed(4);
  const roundedLng = lng.toFixed(4);
  const cacheKey = `env:${roundedLat}:${roundedLng}`;
  
  // Try cache first
  if (redisClient.isOpen) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn(`[segmentSampler] Cache read error:`, err.message);
    }
  }
  
  // Cache miss - fetch from APIs
  let aqi = null;
  let weather = null;
  let traffic = null;
  
  try {
    // Fetch all three in parallel
    const [aqiRaw, weatherRaw, trafficRaw] = await Promise.all([
      fetchAQI(lat, lng).catch(err => {
        console.warn(`[segmentSampler] AQI fetch failed for (${lat}, ${lng}):`, err.message);
        return null;
      }),
      fetchWeather(lat, lng).catch(err => {
        console.warn(`[segmentSampler] Weather fetch failed for (${lat}, ${lng}):`, err.message);
        return null;
      }),
      fetchTraffic(lat, lng).catch(err => {
        console.warn(`[segmentSampler] Traffic fetch failed for (${lat}, ${lng}):`, err.message);
        return null;
      })
    ]);

    // Normalize and map to database schema format
    if (aqiRaw?.results?.[0]) {
      const normalized = normaliseAQI(aqiRaw.results[0]);
      aqi = {
        pm25: normalized.pm25,
        pm10: normalized.pm10,
        no2: normalized.no2,
        o3: normalized.o3,
        co: normalized.co,
        so2: normalized.so2,
        aqi: normalized.aqi,
        latitude: normalized.lat,
        longitude: normalized.lng,
        location_name: normalized.locationName,
        source: normalized.source
      };
    }
    
    if (weatherRaw) {
      const normalized = normaliseWeather(weatherRaw);
      weather = {
        temp_celsius: normalized.tempCelsius,
        humidity_pct: normalized.humidityPct,
        wind_speed_ms: normalized.windSpeedMs,
        wind_deg: normalized.windDeg,
        weather_main: normalized.weatherMain,
        weather_desc: normalized.weatherDesc,
        visibility_m: normalized.visibilityM,
        latitude: normalized.lat,
        longitude: normalized.lng,
        city_name: normalized.cityName,
        source: normalized.source
      };
    }
    
    if (trafficRaw) {
      const normalized = normaliseTraffic(trafficRaw, lat, lng);
      traffic = {
        free_flow_speed: normalized.freeFlowSpeed,
        current_speed: normalized.currentSpeed,
        congestion_level: normalized.congestionLevel,
        travel_time_sec: normalized.travelTimeSec,
        latitude: normalized.lat,
        longitude: normalized.lng,
        segment_id: normalized.segmentId,
        source: normalized.source
      };
    }
  } catch (error) {
    console.error(`[segmentSampler] Error fetching data:`, error.message);
  }
  
  // Cache the result (TTL = 15 minutes for environmental data)
  const result = { aqi, weather, traffic };
  if (redisClient.isOpen) {
    try {
      await redisClient.setEx(cacheKey, 900, JSON.stringify(result)); // 15 min TTL
    } catch (err) {
      console.warn(`[segmentSampler] Cache write error:`, err.message);
    }
  }
  
  return result;
}

/**
 * Samples a polyline to fetch real-time environmental data for each segment.
 * Expects polyline: [[lng1, lat1], [lng2, lat2], ...]
 * 
 * On-Demand Approach: Fetches AQI, Weather, and Traffic data directly from APIs
 * for the actual route coordinates. No pre-cached data needed.
 * 
 * Optimization: Samples every 10th point to reduce API calls while maintaining accuracy.
 */
export async function sampleSegments(polyline) {
  const segments = [];
  
  // Sample intelligently based on route length to avoid API rate limits
  // Short routes (<50 points): sample every 5th point
  // Medium routes (50-200 points): sample every 15th point  
  // Long routes (>200 points): sample every 30th point
  let sampleInterval;
  if (polyline.length < 50) {
    sampleInterval = 5;
  } else if (polyline.length < 200) {
    sampleInterval = 15;
  } else {
    sampleInterval = 30;
  }
  
  console.log(`[segmentSampler] Route has ${polyline.length} points, sampling every ${sampleInterval}th point (${Math.ceil(polyline.length / sampleInterval)} samples)`);


  for (let i = 0; i < polyline.length - 1; i += sampleInterval) {
    const p1 = polyline[i]; // [lng, lat]
    const p2 = polyline[Math.min(i + sampleInterval, polyline.length - 1)];

    const midLng = (p1[0] + p2[0]) / 2;
    const midLat = (p1[1] + p2[1]) / 2;

    const distanceMeters = getDistanceMeters(p1[1], p1[0], p2[1], p2[0]);
    const bearing = getBearing(p1[1], p1[0], p2[1], p2[0]);

    // Fetch environmental data with coordinate-level caching
    const { aqi, weather, traffic } = await fetchEnvironmentalDataWithCache(midLat, midLng);

    const seg = {
      start: p1,
      end: p2,
      midpoint: [midLng, midLat],
      distanceMeters,
      bearing,
      aqi,
      weather,
      traffic,
    };

    segments.push(seg);
  }

  console.log(`[segmentSampler] Successfully sampled ${segments.length} segments`);
  return segments;
}
