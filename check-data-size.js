// Check current data volume in time series tables
import pool from "./src/db/client.js";

async function checkDataSize() {
  const query = `
    SELECT 
      'air_quality' as table_name, 
      COUNT(*) as row_count, 
      MIN(time) as oldest, 
      MAX(time) as newest,
      pg_size_pretty(pg_total_relation_size('air_quality')) as size
    FROM air_quality
    UNION ALL
    SELECT 
      'weather_snapshots', 
      COUNT(*), 
      MIN(time), 
      MAX(time),
      pg_size_pretty(pg_total_relation_size('weather_snapshots'))
    FROM weather_snapshots
    UNION ALL
    SELECT 
      'traffic_conditions', 
      COUNT(*), 
      MIN(time), 
      MAX(time),
      pg_size_pretty(pg_total_relation_size('traffic_conditions'))
    FROM traffic_conditions
    UNION ALL
    SELECT 
      'route_scores', 
      COUNT(*), 
      MIN(time), 
      MAX(time),
      pg_size_pretty(pg_total_relation_size('route_scores'))
    FROM route_scores;
  `;

  try {
    const result = await pool.query(query);
    console.log("\n=== Current Data Volume ===\n");
    console.table(result.rows);
    
    // Calculate total rows
    const totalRows = result.rows.reduce((sum, row) => sum + parseInt(row.row_count), 0);
    console.log(`\nTotal rows across all tables: ${totalRows.toLocaleString()}`);
    
    // Check if cleanup is needed (data older than 30 days)
    const oldDataQuery = `
      SELECT 
        'air_quality' as table_name,
        COUNT(*) as old_rows
      FROM air_quality
      WHERE time < NOW() - INTERVAL '30 days'
      UNION ALL
      SELECT 
        'weather_snapshots',
        COUNT(*)
      FROM weather_snapshots
      WHERE time < NOW() - INTERVAL '30 days'
      UNION ALL
      SELECT 
        'traffic_conditions',
        COUNT(*)
      FROM traffic_conditions
      WHERE time < NOW() - INTERVAL '30 days'
      UNION ALL
      SELECT 
        'route_scores',
        COUNT(*)
      FROM route_scores
      WHERE time < NOW() - INTERVAL '30 days';
    `;
    
    const oldDataResult = await pool.query(oldDataQuery);
    console.log("\n=== Data Older Than 30 Days ===\n");
    console.table(oldDataResult.rows);
    
    const totalOldRows = oldDataResult.rows.reduce((sum, row) => sum + parseInt(row.old_rows), 0);
    if (totalOldRows > 0) {
      console.log(`\n⚠️  ${totalOldRows.toLocaleString()} rows need cleanup`);
    } else {
      console.log("\n✓ No old data to clean up");
    }
    
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    pool.end();
  }
}

checkDataSize();
