import express from 'express';
import { fetchRoutes } from '../scoring/routeFetcher.js';
import { calculateRoutePES } from '../scoring/pesCalculator.js';

export const router = express.Router();

// Kolkata bounding box: approximately 22.5°N to 22.9°N, 88.2°E to 88.6°E
const KOLKATA_BOUNDS = {
  minLat: 22.5,
  maxLat: 22.9,
  minLng: 88.2,
  maxLng: 88.6
};

function isWithinKolkata(lat, lng) {
  return lat >= KOLKATA_BOUNDS.minLat && 
         lat <= KOLKATA_BOUNDS.maxLat && 
         lng >= KOLKATA_BOUNDS.minLng && 
         lng <= KOLKATA_BOUNDS.maxLng;
}

router.post("/score", async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng } = req.body;
    
    if (originLat == null || originLng == null || destLat == null || destLng == null) {
      return res.status(400).json({ error: "Missing origin or destination coordinates" });
    }

    // Validate coordinates are numbers
    const coords = [originLat, originLng, destLat, destLng];
    if (coords.some(c => typeof c !== 'number' || isNaN(c))) {
      return res.status(400).json({ error: "Coordinates must be valid numbers" });
    }

    // Check if origin and destination are the same
    if (originLat === destLat && originLng === destLng) {
      return res.status(400).json({ error: "Origin and destination cannot be the same" });
    }

    // Validate coordinates are within Kolkata bounding box
    if (!isWithinKolkata(originLat, originLng)) {
      return res.status(400).json({ 
        error: "Origin is outside Kolkata service area",
        bounds: KOLKATA_BOUNDS
      });
    }

    if (!isWithinKolkata(destLat, destLng)) {
      return res.status(400).json({ 
        error: "Destination is outside Kolkata service area",
        bounds: KOLKATA_BOUNDS
      });
    }

    const cacheKey = `route:${originLat}:${originLng}:${destLat}:${destLng}`;

    // Check Redis Cache
    if (redisClient.isOpen) {
      try {
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
          console.log(`[score] Cache hit for ${cacheKey}`);
          return res.json(JSON.parse(cachedResult));
        }
      } catch (cacheErr) {
        console.error('[score] Redis get error:', cacheErr.message);
      }
    }

    // 1. Fetch alternative polylines from OpenRouteService
    const polylines = await fetchRoutes(originLat, originLng, destLat, destLng);
    
    // 2. Score them all in parallel via pesCalculator
    const scoredRoutes = await Promise.all(
      polylines.map((polyline, index) => calculateRoutePES(index + 1, polyline)),
    );

    // 3. Sort by PES ascending (lowest first = least polluted / fastest / best)
    scoredRoutes.sort((a, b) => a.pes - b.pes);

    // Save to Redis Cache (TTL = 1 hour = 3600 seconds)
    if (redisClient.isOpen) {
      try {
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(scoredRoutes));
      } catch (cacheErr) {
        console.error('[score] Redis set error:', cacheErr.message);
      }
    }

    // Return the sorted routes
    res.json(scoredRoutes);
  } catch (error) {
    console.error("Error scoring routes:", error.message);
    res.status(500).json({ error: error.message });
  }
});
