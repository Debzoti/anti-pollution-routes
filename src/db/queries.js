// ============================================================
// Raw SQL queries — import by name, keep SQL out of business logic
// ============================================================

export const INSERT_AIR_QUALITY = `
  INSERT INTO air_quality
    (time, location_id, location_name, latitude, longitude,
     pm25, pm10, no2, o3, co, so2, aqi, source)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
`;

export const INSERT_WEATHER = `
  INSERT INTO weather_snapshots
    (time, latitude, longitude, city_name, temp_celsius,
     humidity_pct, wind_speed_ms, wind_deg, weather_main, weather_desc, visibility_m, source)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
`;

export const INSERT_TRAFFIC = `
  INSERT INTO traffic_conditions
    (time, segment_id, latitude, longitude,
     free_flow_speed, current_speed, congestion_level, travel_time_sec, source)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
`;

export const INSERT_ROUTE_SCORE = `
  INSERT INTO route_scores
    (time, route_id, origin_lat, origin_lng, dest_lat, dest_lng,
     aqi_score, traffic_score, weather_score, composite_score, recommended)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
`;

// -- Read queries --

export const LATEST_AIR_QUALITY_NEAR = `
  SELECT * FROM air_quality
  WHERE latitude  BETWEEN $1 - 0.05 AND $1 + 0.05
    AND longitude BETWEEN $2 - 0.05 AND $2 + 0.05
  ORDER BY time DESC
  LIMIT 1
`;

export const LATEST_WEATHER_NEAR = `
  SELECT * FROM weather_snapshots
  WHERE latitude  BETWEEN $1 - 0.05 AND $1 + 0.05
    AND longitude BETWEEN $2 - 0.05 AND $2 + 0.05
  ORDER BY time DESC
  LIMIT 1
`;

export const LATEST_TRAFFIC_NEAR = `
  SELECT * FROM traffic_conditions
  WHERE latitude  BETWEEN $1 - 0.05 AND $1 + 0.05
    AND longitude BETWEEN $2 - 0.05 AND $2 + 0.05
  ORDER BY time DESC
  LIMIT 1
`;

export const NEAREST_AQI_POSTGIS = `
  SELECT * FROM air_quality
  WHERE time > NOW() - INTERVAL '15 minutes'
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography, 
      ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, 
      500
    )
  ORDER BY ST_Distance(
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography, 
    ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
  ) ASC LIMIT 1;
`;

export const NEAREST_WEATHER_POSTGIS = `
  SELECT * FROM weather_snapshots
  WHERE time > NOW() - INTERVAL '15 minutes'
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography, 
      ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, 
      500
    )
  ORDER BY ST_Distance(
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography, 
    ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
  ) ASC LIMIT 1;
`;

export const NEAREST_TRAFFIC_POSTGIS = `
  SELECT * FROM traffic_conditions
  WHERE time > NOW() - INTERVAL '15 minutes'
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography, 
      ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, 
      500
    )
  ORDER BY ST_Distance(
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography, 
    ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
  ) ASC LIMIT 1;
`;
