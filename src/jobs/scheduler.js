import cron from "node-cron";
import { fetchAQI } from "../ingestion/fetchers/aqi.js";
import { fetchWeather } from "../ingestion/fetchers/weather.js";
import { fetchTraffic } from "../ingestion/fetchers/traffic.js";
import { normaliseAQI, normaliseWeather, normaliseTraffic } from "../ingestion/normaliser.js";
import { writeRow } from "../ingestion/writer.js";

// ── Coordinates to poll (you can extend this to a list of city points later)
const POINTS = [
  { lat: 28.6139, lon: 77.209, label: "New Delhi" },
  { lat: 19.076, lon: 72.8777, label: "Mumbai" },
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
