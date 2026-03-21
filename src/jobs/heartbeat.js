// heartbeat.js — runs every 15 minutes to score routes and persist results
import cron from "node-cron";
import { fetchRoutes } from "../scoring/routeFetcher.js";
import { calculateRoutePES } from "../scoring/pesCalculator.js";
import pool from "../db/client.js";
import { INSERT_ROUTE_SCORE } from "../db/queries.js";

// Predefined popular routes to score periodically
// Extend this list with real user routes
const POPULAR_ROUTES = [
  {
    originLat: 28.6139,
    originLng: 77.209,
    destLat: 28.6304,
    destLng: 77.2177,
    label: "Delhi Connaught Place → India Gate",
  },
  {
    originLat: 19.076,
    originLng: 72.8777,
    destLat: 19.033,
    destLng: 72.9001,
    label: "Mumbai CST → Bandra",
  },
];

async function scoreAndStoreRoute(route, routeIndex) {
  const { originLat, originLng, destLat, destLng, label } = route;

  // Fetch alternative polylines
  const polylines = await fetchRoutes(originLat, originLng, destLat, destLng);

  // Score all routes in parallel
  const scoredRoutes = await Promise.all(
    polylines.map((polyline, idx) => calculateRoutePES(idx + 1, polyline)),
  );

  // Sort by PES (lowest first)
  scoredRoutes.sort((a, b) => a.pes - b.pes);

  const timestamp = new Date();

  // Insert all routes, mark the best one as recommended
  for (let i = 0; i < scoredRoutes.length; i++) {
    const scored = scoredRoutes[i];
    const isRecommended = i === 0;

    await pool.query(INSERT_ROUTE_SCORE, [
      timestamp,
      scored.routeId,
      originLat,
      originLng,
      destLat,
      destLng,
      null, // aqi_score (could compute separately if needed)
      null, // traffic_score
      null, // weather_score
      scored.pes,
      isRecommended,
    ]);
  }

  console.log(
    `[heartbeat] Scored ${scoredRoutes.length} routes for ${label}${
      scoredRoutes.length > 0 ? `, recommended: ${scoredRoutes[0].routeId}` : ""
    }`,
  );
  return scoredRoutes;
}

export async function runHeartbeat() {
  console.log("[heartbeat] Starting scheduled scoring...");

  for (let i = 0; i < POPULAR_ROUTES.length; i++) {
    try {
      await scoreAndStoreRoute(POPULAR_ROUTES[i], i);
    } catch (err) {
      console.error(`[heartbeat] Failed to score route ${POPULAR_ROUTES[i].label}:`, err.message);
    }
  }

  console.log("[heartbeat] Completed scheduled scoring");
}

// Run every 15 minutes
cron.schedule("*/15 * * * *", async () => {
  try {
    await runHeartbeat();
  } catch (err) {
    console.error("[heartbeat] Cron job failed:", err.message);
  }
});

console.log("[heartbeat] Cron job registered — runs every 15 minutes");
