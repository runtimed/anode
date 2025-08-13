#!/bin/bash

set -e

# Configuration
BASE_URL="http://localhost:8787"
CLIENT_ID="local-anode-client"
REDIRECT_URI="http://localhost:5173/auth/callback"

echo "🔧 Setting up API key for interaction logs testing..."

# Step 1: Generate initial OIDC access token
echo "📝 Creating OIDC access token..."
code=$(echo '{"firstName":"Test","lastName":"User","email":"test@example.com"}' | base64)

response=$(curl -s -X POST $BASE_URL/local_oidc/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=$CLIENT_ID" \
  -d "code=$code" \
  -d "redirect_uri=$REDIRECT_URI")

if [ $? -ne 0 ]; then
  echo "❌ Failed to get OIDC token"
  exit 1
fi

access_token=$(echo "$response" | jq -r '.access_token')

if [ "$access_token" = "null" ] || [ -z "$access_token" ]; then
  echo "❌ Failed to extract access token"
  echo "Response: $response"
  exit 1
fi

echo "✅ Got OIDC access token"

# Step 2: Create API key
echo "🔑 Creating API key..."
api_key_response=$(curl -s -X POST $BASE_URL/api/api-keys \
  -H "Authorization: Bearer $access_token" \
  -H "Content-Type: application/json" \
  -d '{
    "scopes": ["runt:read", "runt:execute"],
    "expiresAt": "2025-12-31T23:59:59Z",
    "name": "Development Testing Key",
    "userGenerated": true
  }')

if [ $? -ne 0 ]; then
  echo "❌ Failed to create API key"
  exit 1
fi

# Extract the API key (it's returned as a plain string in quotes)
api_key=$(echo "$api_key_response" | sed 's/^"\(.*\)"$/\1/')

if [ -z "$api_key" ]; then
  echo "❌ Failed to extract API key"
  echo "Response: $api_key_response"
  exit 1
fi

echo "✅ Created API key (expires 2025-12-31)"
echo "🔑 API Key: $api_key"

# Step 3: Test interaction logs API
echo ""
echo "📓 Testing interaction logs API..."

# Create a test interaction log
echo "➕ Creating test interaction log..."
create_response=$(curl -s -X POST $BASE_URL/api/i \
  -H "Authorization: Bearer $api_key" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Interactive Log from Script"}')

if [ $? -ne 0 ]; then
  echo "❌ Failed to create interaction log"
  exit 1
fi

echo "✅ Created: $create_response"

# List all interaction logs
echo "📋 Listing all interaction logs..."
list_response=$(curl -s -X GET $BASE_URL/api/i \
  -H "Authorization: Bearer $api_key")

if [ $? -ne 0 ]; then
  echo "❌ Failed to list interaction logs"
  exit 1
fi

echo "📚 Interaction logs:"
echo "$list_response" | jq '.'

# Extract the first log ID for testing
log_id=$(echo "$list_response" | jq -r '.[0].ulid')

if [ "$log_id" != "null" ] && [ ! -z "$log_id" ]; then
  echo ""
  echo "🔍 Getting details for log: $log_id"
  details_response=$(curl -s -X GET $BASE_URL/api/i/$log_id \
    -H "Authorization: Bearer $api_key")

  echo "📋 Log details:"
  echo "$details_response" | jq '.'

  # Test updating the log
  echo ""
  echo "✏️  Updating log title..."
  update_response=$(curl -s -X PUT $BASE_URL/api/i/$log_id \
    -H "Authorization: Bearer $api_key" \
    -H "Content-Type: application/json" \
    -d '{"title": "Updated Test Log from Script"}')

  echo "✅ Update result: $update_response"
fi

echo ""
echo "🎉 All tests completed successfully!"
echo "💾 Save this API key for future testing: $api_key"
echo "⏰ API key expires: 2025-12-31T23:59:59Z"
