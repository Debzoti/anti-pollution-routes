import express from "express";
import pool from "../db/client.js";
import {
  LATEST_AIR_QUALITY_NEAR,
  LATEST_WEATHER_NEAR,
  LATEST_TRAFFIC_NEAR,
} from "../db/queries.js";

export const router = express.Router();

// GET /api/aqi?lat=28.6139&lon=77.2090
router.get("/aqi", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat or lon query params" });
  }
  try {
    const result = await pool.query(LATEST_AIR_QUALITY_NEAR, [parseFloat(lat), parseFloat(lon)]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/weather?lat=28.6139&lon=77.2090
router.get("/weather", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat or lon query params" });
  }
  try {
    const result = await pool.query(LATEST_WEATHER_NEAR, [parseFloat(lat), parseFloat(lon)]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/traffic?lat=28.6139&lon=77.2090
router.get("/traffic", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat or lon query params" });
  }
  try {
    const result = await pool.query(LATEST_TRAFFIC_NEAR, [parseFloat(lat), parseFloat(lon)]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scores?limit=10
router.get("/scores", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  try {
    const result = await pool.query("SELECT * FROM route_scores ORDER BY time DESC LIMIT $1", [
      limit,
    ]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scores/recommended?limit=10
router.get("/scores/recommended", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  try {
    const result = await pool.query(
      "SELECT * FROM route_scores WHERE recommended = true ORDER BY time DESC LIMIT $1",
      [limit],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
