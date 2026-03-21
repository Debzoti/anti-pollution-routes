import pg from "pg";
import config from "../../config.js";

const { Pool } = pg;

// Singleton connection pool — import this everywhere, never create a new Pool elsewhere
const pool = new Pool({
  connectionString: config.dbConnection,
  max: 10, // max concurrent connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err, client) => {
  console.error("[DB] Unexpected pool error:", err.message);
  // Pool will automatically remove the dead client and create new ones on demand
});

export default pool;
