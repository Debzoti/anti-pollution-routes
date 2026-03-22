#!/bin/bash

# Clear Redis cache to remove old response format
echo "Clearing Redis cache..."
docker exec -it anti-poll-routes-redis-1 redis-cli FLUSHALL

if [ $? -eq 0 ]; then
    echo "✓ Cache cleared successfully!"
    echo ""
    echo "Now test the API again - you should see the new format:"
    echo "{"
    echo "  \"success\": true,"
    echo "  \"count\": 3,"
    echo "  \"routes\": [...]"
    echo "}"
else
    echo "✗ Failed to clear cache"
    echo "Make sure Redis container is running: docker ps"
fi
