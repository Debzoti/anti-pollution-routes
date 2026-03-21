import { createClient } from 'redis';
import config from '../../config.js';

// Create a singleton Redis client
export const redisClient = createClient({
  url: config.redisUrl
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

// Connect immediately, but wrap in a function if needed (best practice is to await top-level connect)
// However, typically in Express apps we connect when the app starts.
// For now, we'll expose a connect function or connect aggressively.
export async function connectRedis() {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
    } catch (error) {
      console.error('Failed to connect to Redis. Caching will be disabled:', error.message);
    }
  }
}
