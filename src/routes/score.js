import express from 'express';
import crypto from 'crypto';
import { fetchRoutes } from '../scoring/routeFetcher.js';
import { fetchRoutesFromOla } from '../scoring/olaMapsFetcher.js';
import { calculateRoutePES } from '../scoring/pesCalculator.js';
import { calculateOverallTraffic } from '../scoring/olaTrafficParser.js';
import { redisClient } from '../db/redis.js';
import { validateCoordinates } from '../middleware/validateCoordinates.js';
import { validateRoutes } from '../middleware/validateRoutes.js';

export const router = express.Router();

/**
 * Generate a unique cache key for route-based requests
 * Uses SHA-256 hash of serialized route data
 */
function generateRouteCacheKey(routes) {
  const routeString = JSON.stringify(routes);
  const hash = crypto.createHash('sha256').update(routeString).digest('hex');
  return `route:custom:${hash}`;
}

router.post("/score", validateCoordinates, validateRoutes, async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng, routes } = req.body;

    // Generate cache key based on request type
    const cacheKey = routes 
      ? generateRouteCacheKey(routes)
      : `route:${originLat}:${originLng}:${destLat}:${destLng}`;

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

    // 1. Get routes - either from provided routes or fetch from Ola Maps API
    const fetchedRoutes = routes || await fetchRoutesFromOla(originLat, originLng, destLat, destLng);
    
    // 2. Score them all in parallel via pesCalculator
    const scoredRoutes = await Promise.all(
      fetchedRoutes.map(async (routeData, index) => {
        // Handle both formats: plain polyline array OR object with polyline + metadata
        const polyline = Array.isArray(routeData) ? routeData : routeData.polyline;
        const pesResult = await calculateRoutePES(index + 1, polyline);
        
        // If routeData has metadata from Ola Maps, include it in the response
        if (!Array.isArray(routeData)) {
          // Calculate overall traffic for the route
          const overallTraffic = calculateOverallTraffic(routeData.travelAdvisory || '', polyline);
          
          return {
            ...pesResult,
            distance: routeData.distance,
            duration: routeData.duration,
            distanceText: routeData.distanceText,
            durationText: routeData.durationText,
            traffic: [overallTraffic], // Overall traffic data as array
          };
        }
        
        return pesResult;
      }),
    );

    // 3. Sort by PES ascending (lowest first = least polluted / fastest / best)
    scoredRoutes.sort((a, b) => a.pes - b.pes);

    // 4. Build response object
    const response = {
      success: true,
      count: scoredRoutes.length,
      routes: scoredRoutes,
    };

    // Save to Redis Cache (TTL = 1 hour = 3600 seconds)
    if (redisClient.isOpen) {
      try {
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(response));
      } catch (cacheErr) {
        console.error('[score] Redis set error:', cacheErr.message);
      }
    }

    // Return the response object with routes array
    res.json(response);
  } catch (error) {
    console.error("[score] Error scoring routes:", error.message);
    
    // Handle specific error types gracefully
    if (error.message.includes("No environmental data available")) {
      return res.status(404).json({ 
        error: error.message,
        hint: "Try coordinates in supported cities or check if data ingestion is running"
      });
    }
    
    if (error.message.includes("OPENROUTESERVICE_API_KEY")) {
      return res.status(500).json({ 
        error: "Route service configuration error",
        details: "OpenRouteService API key is missing"
      });
    }
    
    // Generic error response
    res.status(500).json({ 
      error: "Failed to score routes",
      details: error.message 
    });
  }
});
