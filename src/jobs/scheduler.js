import cron from "node-cron";
import { fetchAQI } from "../ingestion/fetchers/aqi.js";
import { fetchWeather } from "../ingestion/fetchers/weather.js";
import { fetchTraffic } from "../ingestion/fetchers/traffic.js";
import { normaliseAQI, normaliseWeather, normaliseTraffic } from "../ingestion/normaliser.js";
import { writeRow } from "../ingestion/writer.js";

// ── Coordinates to poll - Multiple points per city for better coverage
const POINTS = [
  // Mumbai - Multiple areas for city-wide coverage
  { lat: 19.076, lon: 72.8777, label: "Mumbai CST" },
  { lat: 19.0596, lon: 72.8656, label: "Mumbai BKC" },
  { lat: 19.1136, lon: 72.8697, label: "Mumbai Andheri" },
  { lat: 19.0176, lon: 72.8561, label: "Mumbai Dadar" },
  { lat: 19.0728, lon: 72.8826, label: "Mumbai Kurla" },
  { lat: 18.9220, lon: 72.8347, label: "Mumbai South" },
  { lat: 19.1176, lon: 72.9060, label: "Mumbai Powai" },
  { lat: 19.0144, lon: 72.8180, label: "Mumbai Worli" },
  
  // Delhi - Multiple areas for city-wide coverage (expanded)
  { lat: 28.6139, lon: 77.209, label: "Delhi CP" },
  { lat: 28.6519, lon: 77.1909, label: "Delhi Karol Bagh" },
  { lat: 28.5494, lon: 77.2501, label: "Delhi Nehru Place" },
  { lat: 28.6507, lon: 77.2334, label: "Delhi Chandni Chowk" },
  { lat: 28.5244, lon: 77.2066, label: "Delhi Saket" },
  { lat: 28.7041, lon: 77.1025, label: "Delhi Rohini" },
  { lat: 28.5678, lon: 77.2432, label: "Delhi Lajpat Nagar" },
  { lat: 28.6280, lon: 77.2200, label: "Delhi India Gate" },
  { lat: 28.5921, lon: 77.0460, label: "Delhi Dwarka" },
  { lat: 28.6328, lon: 77.2197, label: "Delhi Rajiv Chowk" },
  { lat: 28.7495, lon: 77.0736, label: "Delhi Rohini Sector 7" },
  { lat: 28.6500, lon: 77.1500, label: "Delhi Rajouri Garden" },
  
  // Kolkata - Multiple areas for city-wide coverage
  { lat: 22.5726, lon: 88.3639, label: "Kolkata Park Street" },
  { lat: 22.5851, lon: 88.3468, label: "Kolkata Howrah" },
  { lat: 22.5645, lon: 88.3433, label: "Kolkata Esplanade" },
  { lat: 22.5726, lon: 88.4166, label: "Kolkata Salt Lake" },
  { lat: 22.5320, lon: 88.3647, label: "Kolkata Ballygunge" },
  { lat: 22.5697, lon: 88.3697, label: "Kolkata Sealdah" },
  { lat: 22.5868, lon: 88.4742, label: "Kolkata New Town" },
  { lat: 22.5448, lon: 88.3426, label: "Kolkata Victoria" },
];

// ─────────────────────────────────────────────
// AQI — run every 15 minutes
// ─────────────────────────────────────────────
cron.schedule("*/15 * * * *", async () => {
  console.log("[scheduler] Running AQI ingestion...");
  for (const { lat, lon, label } of POINTS) {
    try {
      const raw = await fetchAQI(lat, lon);
      const results = raw?.results ?? [];
      for (const item of results) {
        const row = normaliseAQI(item);
        await writeRow(row);
      }
      console.log(`[scheduler] AQI: stored ${results.length} readings for ${label}`);
    } catch (err) {
      console.error(`[scheduler] AQI failed for ${label}:`, err.message);
    }
  }
});

// ─────────────────────────────────────────────
// Weather — run every 30 minutes
// ─────────────────────────────────────────────
cron.schedule("*/30 * * * *", async () => {
  console.log("[scheduler] Running Weather ingestion...");
  for (const { lat, lon, label } of POINTS) {
    try {
      
      const raw = await fetchWeather(lat, lon);
      const row = normaliseWeather(raw);
      await writeRow(row);
      console.log(`[scheduler] Weather: stored for ${label}`);
    } catch (err) {
      console.error(`[scheduler] Weather failed for ${label}:`, err.message);
    }
  }
});

// ─────────────────────────────────────────────
// Traffic — run every 10 minutes
// ─────────────────────────────────────────────
cron.schedule("*/10 * * * *", async () => {
  console.log("[scheduler] Running Traffic ingestion...");
  for (const { lat, lon, label } of POINTS) {
    try {
      const raw = await fetchTraffic(lat, lon);
      const row = normaliseTraffic(raw, lat, lon);
      await writeRow(row);
      console.log(`[scheduler] Traffic: stored for ${label}`);
    } catch (err) {
      console.error(`[scheduler] Traffic failed for ${label}:`, err.message);
    }
  }
});

console.log("[scheduler] All cron jobs registered — AQI:15min, Weather:30min, Traffic:10min");
