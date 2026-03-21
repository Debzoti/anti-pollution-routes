import pool from './src/db/client.js';
import { NEAREST_AQI_POSTGIS } from './src/db/queries.js';

async function testPostGIS() {
  try {
    console.log('Testing PostGIS query...');
    const result = await pool.query(NEAREST_AQI_POSTGIS, [77.2090, 28.6139]);
    console.log('Query executed successfully. Result rows:', result.rowCount);
  } catch (err) {
    console.error('Failed to run PostGIS query:', err);
  } finally {
    pool.end();
  }
}

testPostGIS();
