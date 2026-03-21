// Test script to verify edge case validations
const KOLKATA_BOUNDS = {
  minLat: 22.5,
  maxLat: 22.9,
  minLng: 88.2,
  maxLng: 88.6
};

function isWithinKolkata(lat, lng) {
  return lat >= KOLKATA_BOUNDS.minLat &&
    lat <= KOLKATA_BOUNDS.maxLat &&
    lng >= KOLKATA_BOUNDS.minLng &&
    lng <= KOLKATA_BOUNDS.maxLng;
}

function validateRequest(body) {
  const { originLat, originLng, destLat, destLng } = body;

  // Check for missing fields
  if (originLat == null || originLng == null || destLat == null || destLng == null) {
    return { valid: false, error: "Missing origin or destination coordinates" };
  }

  // Check numeric
  const coords = [originLat, originLng, destLat, destLng];
  if (coords.some(c => typeof c !== 'number' || isNaN(c))) {
    return { valid: false, error: "Coordinates must be valid numbers" };
  }

  // Check same origin/destination
  if (originLat === destLat && originLng === destLng) {
    return { valid: false, error: "Origin and destination cannot be the same" };
  }

  // Check Kolkata bounds
  if (!isWithinKolkata(originLat, originLng)) {
    return { valid: false, error: "Origin is outside Kolkata service area" };
  }

  if (!isWithinKolkata(destLat, destLng)) {
    return { valid: false, error: "Destination is outside Kolkata service area" };
  }

  return { valid: true };
}

// Test cases
const testCases = [
  {
    name: "Same origin/destination",
    body: { originLat: 22.6, originLng: 88.4, destLat: 22.6, destLng: 88.4 },
    expectedError: "Origin and destination cannot be the same"
  },
  {
    name: "Outside Kolkata bounds (origin)",
    body: { originLat: 25.0, originLng: 88.4, destLat: 22.6, destLng: 88.4 },
    expectedError: "Origin is outside Kolkata service area"
  },
  {
    name: "Outside Kolkata bounds (destination)",
    body: { originLat: 22.6, originLng: 88.4, destLat: 23.0, destLng: 88.4 },
    expectedError: "Destination is outside Kolkata service area"
  },
  {
    name: "Missing fields",
    body: { originLat: 22.6, originLng: 88.4 },
    expectedError: "Missing origin or destination coordinates"
  },
  {
    name: "Invalid coordinates",
    body: { originLat: "abc", originLng: 88.4, destLat: 22.6, destLng: 88.4 },
    expectedError: "Coordinates must be valid numbers"
  },
  {
    name: "Valid coordinates",
    body: { originLat: 22.6, originLng: 88.4, destLat: 22.7, destLng: 88.5 },
    expectedError: null
  }
];

console.log("=== Edge Case Validation Tests ===\n");

let passed = 0;
let failed = 0;

testCases.forEach(({ name, body, expectedError }) => {
  const result = validateRequest(body);

  if (expectedError === null) {
    if (result.valid) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${name} - Expected valid but got: ${result.error}`);
      failed++;
    }
  } else {
    if (!result.valid && result.error === expectedError) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${name} - Expected: "${expectedError}", Got: "${result.error}"`);
      failed++;
    }
  }
});

console.log(`\n=== Results ===`);
console.log(`Passed: ${passed}/${testCases.length}`);
console.log(`Failed: ${failed}/${testCases.length}`);

process.exit(failed > 0 ? 1 : 0);
