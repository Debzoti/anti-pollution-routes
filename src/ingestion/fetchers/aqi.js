import axios from 'axios';
import config from '../../../config.js';

/**
 * Fetch air quality data from OpenAQ v3.
 * Returns raw JSON from the API — no transformation here.
 */
export async function fetchAQI(lat, lon) {
  const response = await axios.get('https://api.openaq.org/v3/locations', {
    params: { limit: 100, radius: 25000, coordinates: `${lat},${lon}` },
    headers: { 'X-API-Key': config.openaqApiKey },
    timeout: 10000,
  });
  return response.data; // raw API response
}
