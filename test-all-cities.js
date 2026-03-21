/**
 * Test Ola Maps integration with multiple cities
 * Run with: node test-all-cities.js
 */

import fs from 'fs';

const testAllCities = async () => {
  console.log('🧪 Testing Ola Maps Integration - Multiple Cities\n');

  // Load test data
  const testData = JSON.parse(fs.readFileSync('test-cities-data.json', 'utf8'));
  
  console.log(`📋 Testing ${testData.testCases.length} routes across Indian cities\n`);
  console.log('⏳ This will take a few minutes...\n');

  const results = {
    success: [],
    failed: [],
    noData: []
  };

  for (const testCase of testData.testCases) {
    const { city, description, originLat, originLng, destLat, destLng, expectedRoutes } = testCase;
    
    console.log(`📍 ${city}: ${description}`);
    console.log(`   Coordinates: (${originLat}, ${originLng}) → (${destLat}, ${destLng})`);

    try {
      const response = await fetch('http://localhost:3000/api/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ originLat, originLng, destLat, destLng })
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 404) {
          console.log(`   ⚠️  No environmental data available`);
          results.noData.push({ city, description, error: error.error });
        } else {
          console.log(`   ❌ Failed: ${error.error || 'Unknown error'}`);
          results.failed.push({ city, description, error: error.error });
        }
      } else {
        const routes = await response.json();
        console.log(`   ✅ Success! Got ${routes.length} route(s) (expected: ${expectedRoutes})`);
        
        routes.forEach((route, index) => {
          console.log(`      Route ${index + 1}: PES=${route.pes.toFixed(2)}, Distance=${route.distance.toFixed(2)}km, Points=${route.polyline.length}`);
        });
        
        results.success.push({ 
          city, 
          description, 
          routeCount: routes.length,
          expected: expectedRoutes,
          routes: routes.map(r => ({
            pes: r.pes,
            distance: r.distance,
            duration: r.duration,
            points: r.polyline.length
          }))
        });
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.failed.push({ city, description, error: error.message });
    }

    console.log('');
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${results.success.length}`);
  console.log(`⚠️  No Data: ${results.noData.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log('');

  if (results.success.length > 0) {
    console.log('✅ Successful Routes:');
    results.success.forEach(r => {
      console.log(`   ${r.city} - ${r.description}: ${r.routeCount} route(s)`);
    });
    console.log('');
  }

  if (results.noData.length > 0) {
    console.log('⚠️  No Environmental Data (expected for some cities):');
    results.noData.forEach(r => {
      console.log(`   ${r.city} - ${r.description}`);
    });
    console.log('');
  }

  if (results.failed.length > 0) {
    console.log('❌ Failed Routes:');
    results.failed.forEach(r => {
      console.log(`   ${r.city} - ${r.description}: ${r.error}`);
    });
    console.log('');
  }

  // Save detailed results
  fs.writeFileSync('test-results.json', JSON.stringify(results, null, 2));
  console.log('📄 Detailed results saved to test-results.json');
  console.log('');

  // Route count analysis
  if (results.success.length > 0) {
    console.log('📈 Route Count Analysis:');
    const routeCounts = {};
    results.success.forEach(r => {
      const count = r.routeCount;
      routeCounts[count] = (routeCounts[count] || 0) + 1;
    });
    Object.keys(routeCounts).sort().forEach(count => {
      console.log(`   ${count} route(s): ${routeCounts[count]} locations`);
    });
    console.log('');
  }

  console.log('✨ Testing complete!');
};

// Check if server is running
const checkServer = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originLat: 0, originLng: 0, destLat: 0, destLng: 0 })
    });
    return true;
  } catch (error) {
    return false;
  }
};

// Main
(async () => {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error('❌ Server is not running on http://localhost:3000');
    console.error('Start it with: npm run dev');
    process.exit(1);
  }

  await testAllCities();
})();
