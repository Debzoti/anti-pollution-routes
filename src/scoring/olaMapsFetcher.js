import axios from "axios";
import config from "../../config.js";

/**
 * Fetch up to 3 alternative routes between origin and destination from Ola Maps API.
 * Returns an array of polylines. (Each polyline is an array of [lng, lat] coordinate pairs).
 * 
 * Ola Maps API is optimized for Indian roads and provides better routing for Indian cities.
 */
export async function fetchRoutesFromOla(originLat, originLng, destLat, destLng) {
  if (!config.olaMapsApiKey) {
    throw new Error("OLA_MAPS_API_KEY is missing from .env");
  }

  try {
    // Ola Maps Directions API (not Basic) supports alternatives
    // Use POST request with query parameters
    const params = new URLSearchParams({
      origin: `${originLat},${originLng}`,
      destination: `${destLat},${destLng}`,
      alternatives: 'true', // Request alternative routes
      api_key: config.olaMapsApiKey,
    });

    const response = await axios.post(
      `https://api.olamaps.io/routing/v1/directions?${params.toString()}`,
      null, // No body needed
      {
        headers: {
          "X-Request-Id": `route-${Date.now()}`,
        },
        timeout: 10000,
      },
    );

    // Parse Ola Maps response and extract polylines
    const routes = response.data.routes || [];
    
    if (routes.length === 0) {
      throw new Error("No routes found from Ola Maps API");
    }

    // Ola Maps Basic API returns only 1 route, but we can decode the polyline
    // For multiple routes, we would need to use the advanced Directions API
    return routes.map((route) => {
      // Ola Maps returns encoded polyline in overview_polyline field
      if (route.overview_polyline) {
        return decodePolyline(route.overview_polyline);
      }
      
      // Fallback: extract coordinates from steps
      if (route.legs && route.legs[0] && route.legs[0].steps) {
        const coordinates = [];
        route.legs[0].steps.forEach(step => {
          if (step.start_location) {
            coordinates.push([step.start_location.lng, step.start_location.lat]);
          }
        });
        // Add final end location
        const lastStep = route.legs[0].steps[route.legs[0].steps.length - 1];
        if (lastStep && lastStep.end_location) {
          coordinates.push([lastStep.end_location.lng, lastStep.end_location.lat]);
        }
        return coordinates;
      }
      
      throw new Error("Invalid route format from Ola Maps");
    });
  } catch (error) {
    console.error("[olaMapsFetcher] Error fetching routes from Ola Maps:", error.message);
    
    // Provide helpful error messages
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 401) {
        throw new Error("Ola Maps API authentication failed - check your API key");
      }
      if (status === 429) {
        throw new Error("Ola Maps API rate limit exceeded - try again later");
      }
      if (status === 400) {
        throw new Error(`Ola Maps API request error: ${data.message || 'Invalid coordinates'}`);
      }
      
      throw new Error(`Ola Maps API error (${status}): ${data.message || error.message}`);
    }
    
    throw error;
  }
}

/**
 * Decode Google-style encoded polyline to array of [lng, lat] coordinates
 * Ola Maps may use this encoding format
 */
function decodePolyline(encoded) {
  const coordinates = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    // Decode latitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    // Decode longitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push([lng / 1e5, lat / 1e5]); // [lng, lat] format
  }

  return coordinates;
}
