import axios from 'axios';
import config from '../../config.js';

/**
 * Fetch up to 3 alternative routes between origin and destination from OpenRouteService.
 * Returns an array of polylines. (Each polyline is an array of [lng, lat] coordinate pairs).
 */
export async function fetchRoutes(originLat, originLng, destLat, destLng) {
  if (!config.openRouteServiceApiKey) {
    throw new Error('OPENROUTESERVICE_API_KEY is missing from .env');
  }

  const response = await axios.post(
    'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
    {
      coordinates: [
        [originLng, originLat],
        [destLng, destLat]
      ],
      alternative_routes: { target_count: 3 }
    },
    {
      headers: {
        'Authorization': config.openRouteServiceApiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );

  const routes = response.data.features || [];
  return routes.map(feature => feature.geometry.coordinates);
}
