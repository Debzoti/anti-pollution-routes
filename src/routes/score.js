import express from 'express';
import { fetchRoutes } from '../scoring/routeFetcher.js';
import { calculateRoutePES } from '../scoring/pesCalculator.js';
import { redisClient } from '../db/redis.js';
import { validateCoordinates } from '../middleware/validateCoordinates.js';

export const router = express.Router();

router.post("/score", validateCoordinates, async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng } = req.body;

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
