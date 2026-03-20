import axios from 'axios';
import config from '../../../config.js';

/**
 * Fetch traffic flow data from TomTom for a given point.
 * Returns raw JSON from the API — no transformation here.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {number} zoom  — TomTom zoom level (1–22), default 10
 */
export async function fetchTraffic(lat = 28.6139, lon = 77.2090, zoom = 10) {
  const point = `${lat},${lon}`;
  const response = await axios.get(
    `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/${zoom}/json`,
    {
      params: {
        point,
        key: config.tomTomApiKey,
        unit: 'KMPH',
      },
      timeout: 10000,
    }
  );
  return response.data; // raw API response
}
