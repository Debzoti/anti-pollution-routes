// Test cleanup logic by inserting old test data and verifying deletion
import pool from "./src/db/client.js";

const RETENTION_DAYS = 30;

async function testCleanup() {
  console.log("\n=== Testing Cleanup Logic ===\n");

  try {
    // 1. Insert test data with old timestamps
    console.log("1. Inserting test data (35 days old)...");
    const oldTimestamp = new Date();
    oldTimestamp.setDate(oldTimestamp.getDate() - 35); // 35 days ago

    await pool.query(
      `INSERT INTO air_quality (time, location_id, location_name, latitude, longitude, pm25, aqi)
       VALUES ($1, 'test-loc-1', 'Test Location', 22.5726, 88.3639, 45.5, 120)`,
      [oldTimestamp]
    );

    await pool.query(
      `INSERT INTO weather_snapshots (time, latitude, longitude, city_name, temp_celsius, humidity_pct)
       VALUES ($1, 22.5726, 88.3639, 'Test City', 25.5, 65.0)`,
      [oldTimestamp]
    );

    await pool.query(
      `INSERT INTO traffic_conditions (time, segment_id, latitude, longitude, current_speed, congestion_level)
       VALUES ($1, 'test-segment-1', 22.5726, 88.3639, 45.0, 0.3)`,
      [oldTimestamp]
    );

    await pool.query(
      `INSERT INTO route_scores (time, route_id, origin_lat, origin_lng, dest_lat, dest_lng, composite_score)
       VALUES ($1, 'test-route-1', 22.5726, 88.3639, 22.6, 88.4, 75.5)`,
      [oldTimestamp]
    );

    console.log("✓ Test data inserted\n");

    // 2. Insert recent data (should NOT be deleted)
    console.log("2. Inserting recent data (5 days old)...");
    const recentTimestamp = new Date();
    recentTimestamp.setDate(recentTimestamp.getDate() - 5);

    await pool.query(
      `INSERT INTO air_quality (time, location_id, location_name, latitude, longitude, pm25, aqi)
       VALUES ($1, 'test-loc-2', 'Recent Location', 22.5726, 88.3639, 35.5, 90)`,
      [recentTimestamp]
    );

    console.log("✓ Recent data inserted\n");

    // 3. Check counts before cleanup
    console.log("3. Checking data before cleanup...");
    const beforeCounts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM air_quality WHERE location_id LIKE 'test-%') as aq_count,
        (SELECT COUNT(*) FROM weather_snapshots WHERE city_name = 'Test City') as weather_count,
        (SELECT COUNT(*) FROM traffic_conditions WHERE segment_id LIKE 'test-%') as traffic_count,
        (SELECT COUNT(*) FROM route_scores WHERE route_id LIKE 'test-%') as route_count
    `);
    console.log("Before cleanup:", beforeCounts.rows[0]);

    // 4. Run cleanup logic
    console.log("\n4. Running cleanup (deleting data older than 30 days)...");
    const cutoffDate = `NOW() - INTERVAL '${RETENTION_DAYS} days'`;
    const tables = ['air_quality', 'weather_snapshots', 'traffic_conditions', 'route_scores'];
    
    for (const table of tables) {
      const result = await pool.query(
        `DELETE FROM ${table} WHERE time < ${cutoffDate}`
      );
      console.log(`   ${table}: deleted ${result.rowCount} rows`);
    }

    // 5. Check counts after cleanup
    console.log("\n5. Checking data after cleanup...");
    const afterCounts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM air_quality WHERE location_id LIKE 'test-%') as aq_count,
        (SELECT COUNT(*) FROM weather_snapshots WHERE city_name = 'Test City') as weather_count,
        (SELECT COUNT(*) FROM traffic_conditions WHERE segment_id LIKE 'test-%') as traffic_count,
        (SELECT COUNT(*) FROM route_scores WHERE route_id LIKE 'test-%') as route_count
    `);
    console.log("After cleanup:", afterCounts.rows[0]);

    // 6. Verify results
    console.log("\n6. Verification:");
    const before = beforeCounts.rows[0];
    const after = afterCounts.rows[0];

    const aqDeleted = parseInt(before.aq_count) - parseInt(after.aq_count);
    const weatherDeleted = parseInt(before.weather_count) - parseInt(after.weather_count);
    const trafficDeleted = parseInt(before.traffic_count) - parseInt(after.traffic_count);
    const routeDeleted = parseInt(before.route_count) - parseInt(after.route_count);

    console.log(`   air_quality: ${aqDeleted} old row deleted, ${after.aq_count} recent row kept`);
    console.log(`   weather_snapshots: ${weatherDeleted} old row deleted, ${after.weather_count} recent row kept`);
    console.log(`   traffic_conditions: ${trafficDeleted} old row deleted, ${after.traffic_count} recent row kept`);
    console.log(`   route_scores: ${routeDeleted} old row deleted, ${after.route_count} recent row kept`);

    // 7. Cleanup test data
    console.log("\n7. Cleaning up test data...");
    await pool.query(`DELETE FROM air_quality WHERE location_id LIKE 'test-%'`);
    await pool.query(`DELETE FROM weather_snapshots WHERE city_name = 'Test City'`);
    await pool.query(`DELETE FROM traffic_conditions WHERE segment_id LIKE 'test-%'`);
    await pool.query(`DELETE FROM route_scores WHERE route_id LIKE 'test-%'`);

    // 8. Final verification
    if (aqDeleted === 1 && after.aq_count === '1' && 
        weatherDeleted === 1 && trafficDeleted === 1 && routeDeleted === 1) {
      console.log("\n✅ Cleanup logic is ROBUST and working correctly!");
      console.log("   - Old data (35 days) was deleted");
      console.log("   - Recent data (5 days) was preserved");
    } else {
      console.log("\n❌ Cleanup logic has issues - check the results above");
    }

  } catch (err) {
    console.error("\n❌ Test failed:", err.message);
  } finally {
    pool.end();
  }
}

testCleanup();
