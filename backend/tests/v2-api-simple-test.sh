#!/bin/bash

echo "Testing v2 API endpoints..."

# Base URL
BASE_URL="http://localhost:8000/api/v2/memory"

# Test stats
echo -e "\n1. Testing GET /stats"
curl -s "$BASE_URL/stats" | jq '.entities.total, .relations.total'

# Test entity list with pagination
echo -e "\n2. Testing GET /entities with pagination"
curl -s "$BASE_URL/entities?page=1&limit=3" | jq '.pagination'

# Test search
echo -e "\n3. Testing GET /search"
curl -s "$BASE_URL/search?q=memory" | jq '.count'

# Create a test entity
echo -e "\n4. Testing POST /entities"
ENTITY_ID=$(curl -s -X POST "$BASE_URL/entities" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Entity '"$(date +%s)"'",
    "type": "concept",
    "metadata": {"source": "v2 API test"}
  }' | jq -r '.id')

if [ -n "$ENTITY_ID" ] && [ "$ENTITY_ID" != "null" ]; then
  echo "Created entity with ID: $ENTITY_ID"
  
  # Add observation
  echo -e "\n5. Testing POST /entities/:id/observations"
  curl -s -X POST "$BASE_URL/entities/$ENTITY_ID/observations" \
    -H "Content-Type: application/json" \
    -d '{
      "content": "This is a test observation",
      "importance": 75
    }' | jq '.id'
  
  # Clean up
  echo -e "\n6. Cleaning up - DELETE /entities/:id"
  curl -s -X DELETE "$BASE_URL/entities/$ENTITY_ID"
  echo "Entity deleted"
else
  echo "Failed to create entity"
fi

echo -e "\nAll tests completed!"