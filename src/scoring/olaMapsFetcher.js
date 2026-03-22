import axios from "axios";
import config from "../../config.js";

/**
 * Fetch route between origin and destination from Ola Maps API.
 * Returns an array of route objects (typically a single route) containing polyline and metadata.
 * 
 * Note: alternatives=false is used to ensure travel_advisory (traffic data) is included.
 * Ola Maps API only provides travel_advisory for single-route requests (no alternatives).
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
    // Note: alternatives may not include travel_advisory data
    const params = new URLSearchParams({
      origin: `${originLat},${originLng}`,
      destination: `${destLat},${destLng}`,
      alternatives: 'true', // Enable alternatives to get multiple routes
      api_key: config.olaMapsApiKey,
    });

    console.log(`[olaMapsFetcher] Fetching routes from Ola Maps with alternatives=true`);

    const response = await axios.post(
      `https://api.olamaps.io/routing/v1/directions?${params.toString()}`,
      null, // No body needed
      {
        headers: {
          "X-Request-Id": `route-${Date.now()}`,
        },
        timeout: 30000, // Increased to 30 seconds for longer routes
      },
    );

    // Parse Ola Maps response and extract polylines with metadata
    const routes = response.data.routes || [];
    
    console.log(`[olaMapsFetcher] Ola Maps returned ${routes.length} route(s)`);
    
    if (routes.length === 0) {
      throw new Error("No routes found from Ola Maps API");
    }

    // Extract polyline and metadata (distance, duration) from each route
    return routes.map((route) => {
      const leg = route.legs && route.legs[0];
      
      if (!leg) {
        throw new Error("Invalid route format: missing legs data");
      }

      let polyline;
      
      // Ola Maps returns encoded polyline in overview_polyline field
      if (route.overview_polyline) {
        polyline = decodePolyline(route.overview_polyline);
      } 
      // Fallback: extract coordinates from steps
      else if (leg.steps) {
        const coordinates = [];
        leg.steps.forEach(step => {
          if (step.start_location) {
            coordinates.push([step.start_location.lng, step.start_location.lat]);
          }
        });
        // Add final end location
        const lastStep = leg.steps[leg.steps.length - 1];
        if (lastStep && lastStep.end_location) {
          coordinates.push([lastStep.end_location.lng, lastStep.end_location.lat]);
        }
        polyline = coordinates;
      } else {
        throw new Error("Invalid route format: no polyline or steps data");
      }

      // Return route with metadata from Ola Maps including traffic data
      return {
        polyline,
        distance: leg.distance || 0,              // meters
        duration: leg.duration || 0,              // seconds
        distanceText: leg.readable_distance || `${((leg.distance || 0) / 1000).toFixed(1)} km`,
        durationText: leg.readable_duration || `${Math.round((leg.duration || 0) / 60)} min`,
        travelAdvisory: route.travel_advisory || '', // Traffic congestion data
      };
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
