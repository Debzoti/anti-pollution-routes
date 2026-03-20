import axios from "axios";
import config from "../../../config.js";

/**
 * Fetch current weather for a given lat/lon from OpenWeather.
 * Returns raw JSON from the API — no transformation here.
 *
 * @param {number} lat
 * @param {number} lon
 */
export async function fetchWeather(lat = 28.6139, lon = 77.209) {
  const response = await axios.get("https://api.openweathermap.org/data/2.5/weather", {
    params: {
      lat,
      lon,
      appid: config.openWeatherApiKey,
      units: "metric",
    },
    timeout: 10000,
  });
  return response.data; // raw API response
}
