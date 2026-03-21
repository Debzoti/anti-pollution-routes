/**
 * Test Ola Maps integration directly
 * Run with: node test-ola-integration.js
 */

import { fetchRoutesFromOla } from './src/scoring/olaMapsFetcher.js';

const testOlaIntegration = async () => {
  console.log('🧪 Testing Ola Maps Integration\n');

  // Pune coordinates (known to return multiple routes)
  const originLat = 18.76029027465273;
  const originLng = 73.3814242364375;
  const destLat = 18.73354223011708;
  const destLng = 73.44587966939002;

  console.log(`📍 Route: (${originLat}, ${originLng}) → (${destLat}, ${destLng})\n`);

  try {
    const routes = await fetchRoutesFromOla(originLat, originLng, destLat, destLng);
    
    console.log(`✅ Success! Got ${routes.length} route(s)\n`);
    
    routes.forEach((route, index) => {
      console.log(`Route ${index + 1}:`);
      console.log(`  - Points: ${route.length}`);
      console.log(`  - First point: [${route[0][0]}, ${route[0][1]}]`);
      console.log(`  - Last point: [${route[route.length - 1][0]}, ${route[route.length - 1][1]}]`);
      console.log('');
    });

    console.log('✨ Ola Maps integration working!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
};

testOlaIntegration().catch(console.error);
