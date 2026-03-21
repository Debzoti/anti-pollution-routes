import pool from './src/db/client.js';

async function enablePostGIS() {
  try {
    console.log('Connecting to database to enable PostGIS...');
    await pool.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('PostGIS extension enabled successfully.');
  } catch (err) {
    console.error('Failed to enable PostGIS:', err);
  } finally {
    pool.end();
  }
}

enablePostGIS();
