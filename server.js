import express from "express";
import cors from "cors";
import config from "./config.js";
import pool from "./src/db/client.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
// import swaggerUi from 'swagger-ui-express';
import fs from "fs/promises" // Import fs/promises for async file operations
import "./src/jobs/scheduler.js"; // registers all cron jobs on startup
import "./src/jobs/heartbeat.js"; // registers heartbeat cron job

import swaggerUi from "swagger-ui-express";

let swaggerDocument;
try {
    const swaggerContent = await fs.readFile('./swagger-output.json', 'utf8');
    swaggerDocument = JSON.parse(swaggerContent);
} catch (error) {
    console.error("Failed to load swagger.json:", error);
    swaggerDocument = {};
}

const app = express();
app.use(express.static('public'))
app.use(cors());
app.use(express.json());

import { router as scoreRoutes } from "./src/routes/score.js";
import { router as dataRoutes } from "./src/routes/data.js";

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Anti-Pollution Routes API running" });
});

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: "unhealthy",
      database: "disconnected",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.use("/api", scoreRoutes);
app.use("/api", dataRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[server] Listening on port ${config.port}`);
});
