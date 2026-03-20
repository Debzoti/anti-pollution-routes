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

export default config;
