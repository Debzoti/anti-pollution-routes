import express from 'express';

export const router = express.Router();

// Store active SSE connections
const activeConnections = new Map();

/**
 * SSE endpoint for live route updates
 * Client connects and receives updates when better routes are found
 */
router.get("/updates", (req, res) => {
  const { originLat, originLng, destLat, destLng } = req.query;

  if (!originLat || !originLng || !destLat || !destLng) {
    return res.status(400).json({ error: "Missing route coordinates" });
  }

  // Create unique key for this route
  const routeKey = `${originLat}:${originLng}:${destLat}:${destLng}`;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', routeKey })}\n\n`);

  // Store this connection
  if (!activeConnections.has(routeKey)) {
    activeConnections.set(routeKey, new Set());
  }
  activeConnections.get(routeKey).add(res);

  console.log(`[SSE] Client connected for route: ${routeKey}`);
  console.log(`[SSE] Active connections: ${activeConnections.get(routeKey).size}`);

  // Handle client disconnect
  req.on('close', () => {
    const connections = activeConnections.get(routeKey);
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) {
        activeConnections.delete(routeKey);
      }
    }
    console.log(`[SSE] Client disconnected from route: ${routeKey}`);
  });
});

/**
 * Broadcast route update to all connected clients for a specific route
 */
export function broadcastRouteUpdate(originLat, originLng, destLat, destLng, scoredRoutes) {
  const routeKey = `${originLat}:${originLng}:${destLat}:${destLng}`;
  const connections = activeConnections.get(routeKey);

  if (!connections || connections.size === 0) {
    return; // No one listening for this route
  }

  const message = {
    type: 'route_update',
    timestamp: new Date().toISOString(),
    routes: scoredRoutes,
    bestRoute: scoredRoutes[0]
  };

  const data = `data: ${JSON.stringify(message)}\n\n`;

  // Send to all connected clients
  connections.forEach(res => {
    try {
      res.write(data);
    } catch (err) {
      console.error('[SSE] Error sending update:', err.message);
      connections.delete(res);
    }
  });

  console.log(`[SSE] Broadcasted update to ${connections.size} clients for route: ${routeKey}`);
}

/**
 * Get count of active connections for monitoring
 */
export function getActiveConnectionsCount() {
  let total = 0;
  activeConnections.forEach(connections => {
    total += connections.size;
  });
  return total;
}

/**
 * Get all monitored routes
 */
export function getMonitoredRoutes() {
  return Array.from(activeConnections.keys());
}
