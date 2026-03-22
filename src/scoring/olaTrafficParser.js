/**
 * Calculate overall traffic level for entire route
 * Returns single traffic object with route start/end and overall level
 */
export function calculateOverallTraffic(travelAdvisory, polyline) {
  if (!travelAdvisory || travelAdvisory.trim() === '' || !polyline || polyline.length === 0) {
    return {
      start: polyline && polyline[0] ? { lat: polyline[0][1], lng: polyline[0][0] } : null,
      end: polyline && polyline[polyline.length - 1] ? { lat: polyline[polyline.length - 1][1], lng: polyline[polyline.length - 1][0] } : null,
      trafficLevel: 'low',
    };
  }

  const parts = travelAdvisory.split('|');
  let totalTrafficValue = 0;
  let segmentCount = 0;

  // Calculate average traffic across all segments
  for (const part of parts) {
    const [, , olaLevel] = part.split(',').map(Number);
    
    if (!isNaN(olaLevel)) {
      totalTrafficValue += olaLevel;
      segmentCount++;
    }
  }

  // Calculate average traffic level
  const avgTraffic = segmentCount > 0 ? totalTrafficValue / segmentCount : 0;

  // Determine overall traffic level
  let trafficLevel;
  if (avgTraffic <= 3) {
    trafficLevel = 'low';
  } else if (avgTraffic <= 7) {
    trafficLevel = 'moderate';
  } else {
    trafficLevel = 'high';
  }

  // Get route start and end coordinates
  const start = polyline[0];
  const end = polyline[polyline.length - 1];

  return {
    start: {
      lat: start[1],
      lng: start[0],
    },
    end: {
      lat: end[1],
      lng: end[0],
    },
    trafficLevel,
  };
}
