import { fetchAQI } from "./src/ingestion/fetchers/aqi.js";
import { fetchWeather } from "./src/ingestion/fetchers/weather.js";
import { fetchTraffic } from "./src/ingestion/fetchers/traffic.js";
import { normaliseAQI, normaliseWeather, normaliseTraffic } from "./src/ingestion/normaliser.js";

async function testOnDemandFetch() {
  console.log("Testing on-demand environmental data fetching...\n");
  
  // Test coordinates: Mumbai CST
  const lat = 19.076;
  const lng = 72.8777;
  
  console.log(`Fetching data for coordinates: (${lat}, ${lng})`);
  console.log("=".repeat(60));
  
  try {
    // Fetch AQI
    console.log("\n1. Fetching AQI...");
    const aqiRaw = await fetchAQI(lat, lng);
    console.log(`   Raw results: ${aqiRaw?.results?.length || 0} stations found`);
    
    if (aqiRaw?.results?.[0]) {
      const aqiNorm = normaliseAQI(aqiRaw.results[0]);
      console.log(`   ✅ AQI: ${aqiNorm.aqi}, PM2.5: ${aqiNorm.pm25}`);
    } else {
      console.log(`   ⚠️  No AQI data available`);
    }
    
    // Fetch Weather
    console.log("\n2. Fetching Weather...");
    const weatherRaw = await fetchWeather(lat, lng);
    
    if (weatherRaw) {
      const weatherNorm = normaliseWeather(weatherRaw);
      console.log(`   ✅ Temp: ${weatherNorm.tempCelsius}°C, Humidity: ${weatherNorm.humidityPct}%`);
    } else {
      console.log(`   ⚠️  No weather data available`);
    }
    
    // Fetch Traffic
    console.log("\n3. Fetching Traffic...");
    const trafficRaw = await fetchTraffic(lat, lng);
    
    if (trafficRaw) {
      const trafficNorm = normaliseTraffic(trafficRaw, lat, lng);
      console.log(`   ✅ Current speed: ${trafficNorm.current_speed}, Congestion: ${trafficNorm.congestion_level}`);
    } else {
      console.log(`   ⚠️  No traffic data available`);
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ On-demand fetching works! No database needed.");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
  }
}

testOnDemandFetch();
