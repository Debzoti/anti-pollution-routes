import { fetchRoutes } from "./src/scoring/routeFetcher.js";
import { sampleSegments } from "./src/scoring/segmentSampler.js";
import { calculateRoutePES } from "./src/scoring/pesCalculator.js";
import pool from "./src/db/client.js";

async function runTests() {
  try {
    console.log("\n--- Testing routeFetcher ---");
    // Using Kolkata coordinates as requested
    const routes = await fetchRoutes(22.5726, 88.3639, 22.6, 88.4);
    console.log(`Got ${routes.length} polylines from ORS.`);

    if (routes.length > 0) {
      console.log("\n--- Testing segmentSampler ---");
      const segments = await sampleSegments(routes[0]);
      console.log(`Segmenter chopped into ${segments.length} segments.`);
      if (segments.length > 0) {
        console.log("First segment sample (data attached):", segments[0]);
      }

      console.log("\n--- Testing PES Calculator ---");
      const pesResult = await calculateRoutePES(1, routes[0]);
      console.log("PES Result:", {
        routeId: pesResult.routeId,
        pes: pesResult.pes,
        polylinePoints: pesResult.polyline.length,
      });
    }
  } catch (e) {
    console.log("Error during API tests:", e?.response?.data || e.message);
  } finally {
    pool.end();
  }
}
runTests();
