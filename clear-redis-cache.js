/**
 * Clear Redis cache to remove old response format
 * Run this after changing the API response structure
 */

import { createClient } from 'redis';

async function clearCache() {
  console.log('Connecting to Redis...');
  
  const client = createClient({
    socket: {
      host: 'localhost',
      port: 6379,
    },
  });

  try {
    await client.connect();
    console.log('✓ Connected to Redis');

    console.log('\nClearing all cached data...');
    await client.flushAll();
    
    console.log('✓ Cache cleared successfully!\n');
    console.log('Old array-format responses have been removed.');
    console.log('Next API request will return new object format:\n');
    console.log('{');
    console.log('  "success": true,');
    console.log('  "count": 3,');
    console.log('  "routes": [...]');
    console.log('}\n');

    await client.disconnect();
    console.log('✓ Disconnected from Redis');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nMake sure:');
    console.error('1. Redis is running (docker-compose up -d)');
    console.error('2. Redis is accessible on localhost:6379');
    process.exit(1);
  }
}

clearCache();
