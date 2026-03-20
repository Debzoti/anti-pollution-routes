import express from 'express';
import { fetchRoutes } from '../scoring/routeFetcher.js';
import { calculateRoutePES } from '../scoring/pesCalculator.js';

export const router = express.Router();

router.post('/score', async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng } = req.body;
    
    if (originLat == null || originLng == null || destLat == null || destLng == null) {
      return res.status(400).json({ error: "Missing origin or destination coordinates" });
    }

    // 1. Fetch up to 5 alternative polylines from OpenRouteService
    const polylines = await fetchRoutes(originLat, originLng, destLat, destLng);
    
    // 2. Score them all in parallel via pesCalculator
    const scoredRoutes = await Promise.all(
      polylines.map((polyline, index) => calculateRoutePES(index + 1, polyline))
    );

    // 3. Sort by PES ascending (lowest first = least polluted / fastest / best)
    scoredRoutes.sort((a, b) => a.pes - b.pes);

    // Return the sorted routes
    res.json(scoredRoutes);
  } catch (error) {
    console.error('Error scoring routes:', error.message);
    res.status(500).json({ error: error.message });
  }
});
