import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const TIMEOUT = 15000; // 15 seconds

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// Test Ola Maps API
async function testOlaMaps() {
  const apiKey = process.env.OLA_MAPS_API_KEY;
  
  if (!apiKey) {
    log(colors.red, '❌ OLA_MAPS_API_KEY not found in .env');
    return false;
  }

  log(colors.cyan, '\n🔍 Testing Ola Maps API...');
  log(colors.blue, `   API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);

  try {
    const startTime = Date.now();
    const params = new URLSearchParams({
      origin: '19.076,72.8777',
      destination: '19.0850,72.8950',
      alternatives: 'true',
      api_key: apiKey,
    });

    const response = await axios.post(
      `https://api.olamaps.io/routing/v1/directions?${params.toString()}`,
      null,
      {
        headers: { 'X-Request-Id': `health-check-${Date.now()}` },
        timeout: TIMEOUT,
      }
    );

    const duration = Date.now() - startTime;
    const routes = response.data.routes || [];
    
    log(colors.green, `✅ Ola Maps API: HEALTHY`);
    log(colors.blue, `   Response time: ${duration}ms`);
    log(colors.blue, `   Routes returned: ${routes.length}`);
    
    if (routes.length > 0 && routes[0].legs && routes[0].legs[0]) {
      const leg = routes[0].legs[0];
      log(colors.blue, `   Distance: ${leg.readable_distance || 'N/A'}`);
      log(colors.blue, `   Duration: ${leg.readable_duration || 'N/A'}`);
    }
    
    return true;
  } catch (error) {
    log(colors.red, `❌ Ola Maps API: FAILED`);
    if (error.code === 'ECONNABORTED') {
      log(colors.yellow, `   Error: Request timeout (>${TIMEOUT}ms)`);
    } else if (error.response) {
      log(colors.yellow, `   Status: ${error.response.status}`);
      log(colors.yellow, `   Message: ${error.response.data?.message || error.message}`);
    } else {
      log(colors.yellow, `   Error: ${error.message}`);
    }
    return false;
  }
}

// Test OpenWeatherMap API
async function testOpenWeather() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    log(colors.red, '❌ OPENWEATHER_API_KEY not found in .env');
    return false;
  }

  log(colors.cyan, '\n🔍 Testing OpenWeatherMap API...');
  log(colors.blue, `   API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);

  try {
    const startTime = Date.now();
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather`,
      {
        params: {
          lat: 19.076,
          lon: 72.8777,
          appid: apiKey,
        },
        timeout: TIMEOUT,
      }
    );

    const duration = Date.now() - startTime;
    
    log(colors.green, `✅ OpenWeatherMap API: HEALTHY`);
    log(colors.blue, `   Response time: ${duration}ms`);
    log(colors.blue, `   Location: ${response.data.name}`);
    log(colors.blue, `   Temperature: ${(response.data.main.temp - 273.15).toFixed(1)}°C`);
    
    return true;
  } catch (error) {
    log(colors.red, `❌ OpenWeatherMap API: FAILED`);
    if (error.code === 'ECONNABORTED') {
      log(colors.yellow, `   Error: Request timeout (>${TIMEOUT}ms)`);
    } else if (error.response) {
      log(colors.yellow, `   Status: ${error.response.status}`);
      log(colors.yellow, `   Message: ${error.response.data?.message || error.message}`);
    } else {
      log(colors.yellow, `   Error: ${error.message}`);
    }
    return false;
  }
}

// Test OpenAQ API (v3)
async function testOpenAQ() {
  const apiKey = process.env.OPENAQ_API_KEY;
  
  if (!apiKey) {
    log(colors.red, '❌ OPENAQ_API_KEY not found in .env');
    return false;
  }

  log(colors.cyan, '\n🔍 Testing OpenAQ API (v3)...');
  log(colors.blue, `   API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);

  try {
    const startTime = Date.now();
    const response = await axios.get(
      'https://api.openaq.org/v3/locations',
      {
        params: {
          coordinates: '19.076,72.8777',
          radius: 25000,
          limit: 100,
        },
        headers: {
          'X-API-Key': apiKey,
        },
        timeout: TIMEOUT,
      }
    );

    const duration = Date.now() - startTime;
    const results = response.data.results || [];
    
    log(colors.green, `✅ OpenAQ API (v3): HEALTHY`);
    log(colors.blue, `   Response time: ${duration}ms`);
    log(colors.blue, `   Locations found: ${results.length}`);
    
    if (results.length > 0) {
      log(colors.blue, `   First location: ${results[0].name || 'N/A'}`);
      log(colors.blue, `   Country: ${results[0].country?.name || 'N/A'}`);
    }
    
    return true;
  } catch (error) {
    log(colors.red, `❌ OpenAQ API (v3): FAILED`);
    if (error.code === 'ECONNABORTED') {
      log(colors.yellow, `   Error: Request timeout (>${TIMEOUT}ms)`);
    } else if (error.response) {
      log(colors.yellow, `   Status: ${error.response.status}`);
      log(colors.yellow, `   Message: ${error.response.data?.message || error.message}`);
    } else {
      log(colors.yellow, `   Error: ${error.message}`);
    }
    return false;
  }
}

// Test TomTom Traffic API
async function testTomTom() {
  const apiKey = process.env.TOMTOM_API_KEY;
  
  if (!apiKey) {
    log(colors.red, '❌ TOMTOM_API_KEY not found in .env');
    return false;
  }

  log(colors.cyan, '\n🔍 Testing TomTom Traffic API...');
  log(colors.blue, `   API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);

  try {
    const startTime = Date.now();
    const response = await axios.get(
      `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json`,
      {
        params: {
          key: apiKey,
          point: '19.076,72.8777',
        },
        timeout: TIMEOUT,
      }
    );

    const duration = Date.now() - startTime;
    
    log(colors.green, `✅ TomTom Traffic API: HEALTHY`);
    log(colors.blue, `   Response time: ${duration}ms`);
    log(colors.blue, `   Current speed: ${response.data.flowSegmentData?.currentSpeed || 'N/A'} km/h`);
    log(colors.blue, `   Free flow speed: ${response.data.flowSegmentData?.freeFlowSpeed || 'N/A'} km/h`);
    
    return true;
  } catch (error) {
    log(colors.red, `❌ TomTom Traffic API: FAILED`);
    if (error.code === 'ECONNABORTED') {
      log(colors.yellow, `   Error: Request timeout (>${TIMEOUT}ms)`);
    } else if (error.response) {
      log(colors.yellow, `   Status: ${error.response.status}`);
      log(colors.yellow, `   Message: ${error.response.data?.message || error.message}`);
    } else {
      log(colors.yellow, `   Error: ${error.message}`);
    }
    return false;
  }
}

// Main execution
async function runHealthCheck() {
  log(colors.cyan, '═══════════════════════════════════════════════════');
  log(colors.cyan, '          API HEALTH CHECK REPORT');
  log(colors.cyan, '═══════════════════════════════════════════════════');

  const results = {
    olaMaps: await testOlaMaps(),
    openWeather: await testOpenWeather(),
    openAQ: await testOpenAQ(),
    tomTom: await testTomTom(),
  };

  log(colors.cyan, '\n═══════════════════════════════════════════════════');
  log(colors.cyan, '                   SUMMARY');
  log(colors.cyan, '═══════════════════════════════════════════════════');

  const total = Object.keys(results).length;
  const healthy = Object.values(results).filter(Boolean).length;
  const failed = total - healthy;

  log(colors.blue, `\nTotal APIs tested: ${total}`);
  log(colors.green, `Healthy: ${healthy}`);
  log(colors.red, `Failed: ${failed}`);

  if (failed > 0) {
    log(colors.yellow, '\n⚠️  Some APIs are not responding correctly.');
    log(colors.yellow, '   This may cause scheduler slowness and data collection issues.');
    log(colors.yellow, '\n💡 Recommendations:');
    log(colors.yellow, '   1. Check API key validity and quotas');
    log(colors.yellow, '   2. Verify network connectivity');
    log(colors.yellow, '   3. Check if APIs are experiencing downtime');
    log(colors.yellow, '   4. Consider increasing timeout values if network is slow');
  } else {
    log(colors.green, '\n✅ All APIs are healthy!');
  }

  log(colors.cyan, '\n═══════════════════════════════════════════════════\n');
}

runHealthCheck().catch(error => {
  log(colors.red, `\n❌ Health check failed: ${error.message}`);
  process.exit(1);
});
