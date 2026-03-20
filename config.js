import dotenv from "dotenv";

dotenv.config();

const config = {
  port: process.env.PORT || 3000,
  openaqApiKey: process.env.OPENAQ_API_KEY,
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY,
  tomTomApiKey: process.env.TOMTOM_API_KEY,
  openRouteServiceApiKey: process.env.OPENROUTESERVICE_API_KEY,
  dbConnection: process.env.DB_CONNECTION,
};

// Validate critical environment variables on startup
function validateConfig() {
  const required = {
    openaqApiKey: "OPENAQ_API_KEY",
    openWeatherApiKey: "OPENWEATHER_API_KEY",
    tomTomApiKey: "TOMTOM_API_KEY",
    openRouteServiceApiKey: "OPENROUTESERVICE_API_KEY",
    dbConnection: "DB_CONNECTION",
  };

  const missing = [];
  for (const [key, envName] of Object.entries(required)) {
    if (!config[key]) {
      missing.push(envName);
    }
  }

  if (missing.length > 0) {
    console.error("[config] Missing required environment variables:", missing.join(", "));
    console.error("[config] Please check your .env file against .env.example");
    process.exit(1);
  }
}

validateConfig();

export default config;
