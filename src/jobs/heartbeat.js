// heartbeat.js — runs every 15 minutes to score routes and persist results
import cron from "node-cron";
import { fetchRoutes } from "../scoring/routeFetcher.js";
import { calculateRoutePES } from "../scoring/pesCalculator.js";
import pool from "../db/client.js";
import { INSERT_ROUTE_SCORE } from "../db/queries.js";
import { redisClient } from "../db/redis.js";
import { broadcastRouteUpdate, getMonitoredRoutes } from "../routes/sse.js";

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

  // Check if this route has active SSE listeners
  const routeKey = `${originLat}:${originLng}:${destLat}:${destLng}`;
  const cacheKey = `route:${routeKey}`;

  // Fetch alternative polylines
  const polylines = await fetchRoutes(originLat, originLng, destLat, destLng);

  // Score all routes in parallel
  const scoredRoutes = await Promise.all(
    polylines.map((polyline, idx) => calculateRoutePES(idx + 1, polyline)),
  );

  // Sort by PES (lowest first)
  scoredRoutes.sort((a, b) => a.pes - b.pes);

  const timestamp = new Date();
  const newBestRoute = scoredRoutes[0];

  // Check if the best route changed (compare with Redis cache)
  let routeChanged = false;
  if (redisClient.isOpen) {
    try {
      const cachedResult = await redisClient.get(cacheKey);
      if (cachedResult) {
        const cachedRoutes = JSON.parse(cachedResult);
        const oldBestRoute = cachedRoutes[0];
        
        // Route changed if best route ID or PES score changed significantly
        if (oldBestRoute.routeId !== newBestRoute.routeId || 
            Math.abs(oldBestRoute.pes - newBestRoute.pes) > 5) {
          routeChanged = true;
          console.log(`[heartbeat] 🔄 Route changed for ${label}:`);
          console.log(`   Old: ${oldBestRoute.routeId} (PES: ${oldBestRoute.pes})`);
          console.log(`   New: ${newBestRoute.routeId} (PES: ${newBestRoute.pes})`);
        }
      }

      // Update Redis cache with new scores
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(scoredRoutes));
    } catch (err) {
      console.error('[heartbeat] Redis error:', err.message);
    }
  }

  // Insert all routes into database
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

  // Broadcast update to connected SSE clients if route changed
  if (routeChanged) {
    broadcastRouteUpdate(originLat, originLng, destLat, destLng, scoredRoutes);
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

  // Score predefined popular routes
  for (let i = 0; i < POPULAR_ROUTES.length; i++) {
    try {
      await scoreAndStoreRoute(POPULAR_ROUTES[i], i);
    } catch (err) {
      console.error(`[heartbeat] Failed to score route ${POPULAR_ROUTES[i].label}:`, err.message);
    }
  }

  // Also score any routes that have active SSE listeners
  const monitoredRoutes = getMonitoredRoutes();
  if (monitoredRoutes.length > 0) {
    console.log(`[heartbeat] Scoring ${monitoredRoutes.length} monitored routes...`);
    
    for (const routeKey of monitoredRoutes) {
      const [originLat, originLng, destLat, destLng] = routeKey.split(':').map(Number);
      
      // Skip if already in popular routes
      const isPopular = POPULAR_ROUTES.some(r => 
        r.originLat === originLat && r.originLng === originLng &&
        r.destLat === destLat && r.destLng === destLng
      );
      
      if (!isPopular) {
        try {
          await scoreAndStoreRoute({
            originLat,
            originLng,
            destLat,
            destLng,
            label: `User route ${routeKey}`
          }, -1);
        } catch (err) {
          console.error(`[heartbeat] Failed to score monitored route ${routeKey}:`, err.message);
        }
      }
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
