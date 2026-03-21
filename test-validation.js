// Test script for /api/score validation
const testCases = [
  {
    name: "Missing coordinates",
    body: { originLat: 22.6 },
    expectedStatus: 400,
    expectedError: "Missing origin or destination coordinates"
  },
  {
    name: "String coordinates (not numbers)",
    body: { originLat: "22.6", originLng: "88.4", destLat: "22.7", destLng: "88.5" },
    expectedStatus: 400,
    expectedError: "Coordinates must be valid numbers"
  },
  {
    name: "Same origin and destination",
    body: { originLat: 22.6, originLng: 88.4, destLat: 22.6, destLng: 88.4 },
    expectedStatus: 400,
    expectedError: "Origin and destination cannot be the same"
  },
  {
    name: "Origin outside Kolkata",
    body: { originLat: 23.0, originLng: 88.4, destLat: 22.6, destLng: 88.4 },
    expectedStatus: 400,
    expectedError: "Origin is outside Kolkata service area"
  },
  {
    name: "Destination outside Kolkata",
    body: { originLat: 22.6, originLng: 88.4, destLat: 22.6, destLng: 89.0 },
    expectedStatus: 400,
    expectedError: "Destination is outside Kolkata service area"
  },
  {
    name: "Valid Kolkata coordinates (Howrah to Salt Lake)",
    body: { originLat: 22.5958, originLng: 88.2636, destLat: 22.5868, destLng: 88.4171 },
    expectedStatus: 200
  }
];

async function runTests() {
  console.log("Testing /api/score validation...\n");
  
  for (const testCase of testCases) {
    try {
      const response = await fetch('http://localhost:3000/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.body)
      });
      
      const data = await response.json();
      const passed = response.status === testCase.expectedStatus;
      
      console.log(`${passed ? '✅' : '❌'} ${testCase.name}`);
      console.log(`   Status: ${response.status} (expected ${testCase.expectedStatus})`);
      
      if (testCase.expectedError && data.error !== testCase.expectedError) {
        console.log(`   Error mismatch:`);
        console.log(`   Expected: "${testCase.expectedError}"`);
        console.log(`   Got: "${data.error}"`);
      } else if (testCase.expectedError) {
        console.log(`   Error: "${data.error}"`);
      }
      
      console.log();
    } catch (error) {
      console.log(`❌ ${testCase.name} - Network error: ${error.message}\n`);
    }
  }
}

runTests();
