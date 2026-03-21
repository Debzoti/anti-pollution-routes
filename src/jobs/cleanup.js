// cleanup.js — deletes time series data older than retention period
import cron from "node-cron";
import pool from "../db/client.js";

const RETENTION_DAYS = 30; // keep last 30 days

async function cleanupOldData() {
  console.log(`[cleanup] Removing data older than ${RETENTION_DAYS} days...`);
  
  const cutoffDate = `NOW() - INTERVAL '${RETENTION_DAYS} days'`;
  
  try {
    const tables = ['air_quality', 'weather_snapshots', 'traffic_conditions', 'route_scores'];
    
    for (const table of tables) {
      const result = await pool.query(
        `DELETE FROM ${table} WHERE time < ${cutoffDate}`
      );
      console.log(`[cleanup] ${table}: deleted ${result.rowCount} rows`);
    }
  } catch (err) {
    console.error("[cleanup] Failed:", err.message);
  }
}

// Run daily at 2 AM
cron.schedule("0 2 * * *", cleanupOldData);

console.log(`[cleanup] Cron job registered — runs daily at 2 AM (retention: ${RETENTION_DAYS} days)`);
