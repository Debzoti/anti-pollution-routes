import { sampleSegments } from "./src/scoring/segmentSampler.js";

async function testFullSampling() {
  console.log("Testing full segment sampling with on-demand fetching...\n");
  
  // Simple test route: Mumbai CST to nearby point
  const polyline = [
    [72.8777, 19.076],   // Start
    [72.88, 19.078],     // Mid
    [72.895, 19.085]     // End
  ];
  
  console.log(`Test route: ${polyline.length} points`);
  console.log("=".repeat(60));
  
  try {
    const startTime = Date.now();
    const segments = await sampleSegments(polyline);
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ Sampled ${segments.length} segments in ${duration}ms\n`);
    
    segments.forEach((seg, idx) => {
      console.log(`Segment ${idx + 1}:`);
      console.log(`  Midpoint: (${seg.midpoint[1].toFixed(4)}, ${seg.midpoint[0].toFixed(4)})`);
      console.log(`  Distance: ${seg.distanceMeters.toFixed(0)}m`);
      console.log(`  AQI: ${seg.aqi ? `PM2.5=${seg.aqi.pm25}` : 'null'}`);
      console.log(`  Weather: ${seg.weather ? `${seg.weather.temp_celsius}°C, ${seg.weather.humidity_pct}%` : 'null'}`);
      console.log(`  Traffic: ${seg.traffic ? `${seg.traffic.current_speed}km/h` : 'null'}`);
      console.log();
    });
    
    console.log("=".repeat(60));
    console.log("✅ On-demand segment sampling works!");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
  }
}

testFullSampling();
