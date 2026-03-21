/**
 * normaliser.js
 * Converts raw API responses into the internal standard shape.
 * This is the contract every other part of the system relies on.
 *
 * Standard shapes:
 *   AQI row       → { type:'aqi',     timestamp, locationId, locationName, lat, lng, pm25, pm10, no2, o3, co, so2, aqi, source }
 *   Weather row   → { type:'weather', timestamp, lat, lng, cityName, tempCelsius, humidityPct, windSpeedMs, windDeg, weatherMain, weatherDesc, visibilityM, source }
 *   Traffic row   → { type:'traffic', timestamp, segmentId, lat, lng, freeFlowSpeed, currentSpeed, congestionLevel, travelTimeSec, source }
 */

/**
 * Normalise a single OpenAQ location object.
 * @param {object} raw  — one item from response.data.results[]
 * @returns {object}    — standard AQI shape
 */
export function normaliseAQI(raw) {
  const getParam = (name) => raw.parameters?.find((p) => p.parameter === name)?.lastValue ?? null;

  return {
    type: "aqi",
    timestamp: raw.datetimeLast?.utc ? new Date(raw.datetimeLast.utc) : new Date(),
    locationId: String(raw.id),
    locationName: raw.name ?? null,
    lat: raw.coordinates?.latitude ?? null,
    lng: raw.coordinates?.longitude ?? null,
    pm25: getParam("pm25"),
    pm10: getParam("pm10"),
    no2: getParam("no2"),
    o3: getParam("o3"),
    co: getParam("co"),
    so2: getParam("so2"),
    aqi: null, // OpenAQ doesn't give a composite AQI — scoring engine computes this
    source: "openaq",
  };
}

/**
 * Normalise a single OpenWeather /weather response.
 * @param {object} raw  — full response.data
 * @returns {object}    — standard weather shape
 */
export function normaliseWeather(raw) {
  return {
    type: "weather",
    timestamp: raw.dt ? new Date(raw.dt * 1000) : new Date(),
    lat: raw.coord?.lat ?? null,
    lng: raw.coord?.lon ?? null,
    cityName: raw.name ?? null,
    tempCelsius: raw.main?.temp ?? null,
    humidityPct: raw.main?.humidity ?? null,
    windSpeedMs: raw.wind?.speed ?? null,
    windDeg: raw.wind?.deg ?? null,
    weatherMain: raw.weather?.[0]?.main ?? null,
    weatherDesc: raw.weather?.[0]?.description ?? null,
    visibilityM: raw.visibility ?? null,
    source: "openweather",
  };
}

/**
 * Normalise a TomTom flowSegmentData response.
 * @param {object} raw       — full response.data
 * @param {number} lat       — the point queried (TomTom doesn't echo it back)
 * @param {number} lng
 * @returns {object}         — standard traffic shape
 */
export function normaliseTraffic(raw, lat, lng) {
  const seg = raw.flowSegmentData ?? {};
  const freeFlow = seg.freeFlowSpeed ?? null;
  const current = seg.currentSpeed ?? null;
  const congestion = freeFlow && current ? Math.max(0, 1 - current / freeFlow) : null;

  return {
    type: "traffic",
    timestamp: new Date(),
    segmentId: seg.frc ?? `${lat},${lng}`, // functional road class as id fallback
    lat,
    lng,
    freeFlowSpeed: freeFlow,
    currentSpeed: current,
    congestionLevel: congestion !== null ? parseFloat(congestion.toFixed(4)) : null,
    travelTimeSec: seg.currentTravelTime ?? null,
    source: "tomtom",
  };
}
