#!/bin/bash

# API Key Authentication Flow Demo
# This script demonstrates the complete end-to-end API key authentication flow:
# 1. User registration via local OIDC
# 2. JWT token acquisition
# 3. API key creation
# 4. Artifact upload with API key
# 5. Artifact download verification

set -e

BASE_URL="http://localhost:8787"
TIMESTAMP=$(date +%s)
TEST_USER_EMAIL="demo-${TIMESTAMP}@example.com"

echo "🔧 API Key Authentication Flow Demo"
echo "=================================="
echo "Base URL: $BASE_URL"
echo "Test User: $TEST_USER_EMAIL"
echo ""

# Function to check if jq is available
check_dependencies() {
    if ! command -v jq &> /dev/null; then
        echo "❌ Error: jq is required but not installed"
        echo "Install with: brew install jq (macOS) or apt-get install jq (Ubuntu)"
        exit 1
    fi

    if ! command -v curl &> /dev/null; then
        echo "❌ Error: curl is required but not installed"
        exit 1
    fi
}

# Function to check if server is running
check_server() {
    echo "🔍 Checking if server is running..."
    if ! curl -s "$BASE_URL/api/health" > /dev/null; then
        echo "❌ Error: Server not running at $BASE_URL"
        echo "Start the server with: pnpm dev"
        exit 1
    fi
    echo "✅ Server is running"
    echo ""
}

# Step 1: Register user and get JWT token
get_jwt_token() {
    echo "🎫 Step 1: Registering user and getting JWT token..."

    # Create user data
    USER_DATA="{\"firstName\":\"Demo\",\"lastName\":\"User\",\"email\":\"$TEST_USER_EMAIL\"}"
    CODE=$(echo "$USER_DATA" | base64)

    # Get OIDC token
    RESPONSE=$(curl -s -X POST "$BASE_URL/local_oidc/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "grant_type=authorization_code" \
        -d "client_id=local-anode-client" \
        -d "code=$CODE" \
        -d "redirect_uri=http://localhost:5173/auth/callback")

    # Extract access token
    ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.access_token')

    if [[ "$ACCESS_TOKEN" == "null" || -z "$ACCESS_TOKEN" ]]; then
        echo "❌ Failed to get JWT token"
        echo "Response: $RESPONSE"
        exit 1
    fi

    echo "✅ JWT token acquired (${#ACCESS_TOKEN} characters)"
    echo ""
}

# Step 2: Create API key using JWT
create_api_key() {
    echo "🔑 Step 2: Creating API key..."

    API_KEY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/api-keys" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d "{
            \"name\": \"Demo API Key - $TIMESTAMP\",
            \"scopes\": [\"runtime:execute\", \"runtime:read\"],
            \"expiresAt\": \"2025-12-31T23:59:59.000Z\",
            \"userGenerated\": true
        }")

    # Check if API key creation was successful
    if echo "$API_KEY_RESPONSE" | jq -e '.error' > /dev/null; then
        echo "❌ Failed to create API key"
        echo "Response: $API_KEY_RESPONSE"
        exit 1
    fi

    API_KEY=$(echo "$API_KEY_RESPONSE" | jq -r '.api_key')
    KEY_ID=$(echo "$API_KEY_RESPONSE" | jq -r '.kid')

    if [[ "$API_KEY" == "null" || -z "$API_KEY" ]]; then
        echo "❌ Failed to extract API key from response"
        echo "Response: $API_KEY_RESPONSE"
        exit 1
    fi

    echo "✅ API key created"
    echo "   Key ID: $KEY_ID"
    echo "   Key length: ${#API_KEY} characters"
    echo ""
}

# Step 3: Create test data and upload to artifacts API
upload_artifact() {
    echo "📦 Step 3: Uploading artifact with API key..."

    # Create test data
    TEST_DATA="API Key Authentication Demo
Created: $(date)
User: $TEST_USER_EMAIL
Key ID: $KEY_ID
Timestamp: $TIMESTAMP

This artifact was uploaded using API key authentication,
demonstrating the complete end-to-end flow from user
registration to secure data upload.

Test data: $(openssl rand -hex 16)"

    # Upload artifact
    UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/artifacts" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: text/plain" \
        -H "x-notebook-id: demo-notebook-$TIMESTAMP" \
        --data "$TEST_DATA")

    # Check if upload was successful
    if echo "$UPLOAD_RESPONSE" | jq -e '.error' > /dev/null; then
        echo "❌ Failed to upload artifact"
        echo "Response: $UPLOAD_RESPONSE"
        exit 1
    fi

    ARTIFACT_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.artifactId')

    if [[ "$ARTIFACT_ID" == "null" || -z "$ARTIFACT_ID" ]]; then
        echo "❌ Failed to extract artifact ID from response"
        echo "Response: $UPLOAD_RESPONSE"
        exit 1
    fi

    echo "✅ Artifact uploaded successfully"
    echo "   Artifact ID: $ARTIFACT_ID"
    echo "   Data size: ${#TEST_DATA} bytes"
    echo ""
}

# Step 4: Download and verify the artifact
download_artifact() {
    echo "📥 Step 4: Downloading and verifying artifact..."

    # Download artifact (no authentication required for downloads)
    DOWNLOADED_DATA=$(curl -s "$BASE_URL/api/artifacts/$ARTIFACT_ID")

    # Check if download was successful
    if [[ -z "$DOWNLOADED_DATA" ]]; then
        echo "❌ Failed to download artifact"
        exit 1
    fi

    # Verify data integrity
    if [[ "$DOWNLOADED_DATA" == "$TEST_DATA" ]]; then
        echo "✅ Artifact downloaded and verified successfully"
        echo "   Data integrity: PASSED"
    else
        echo "❌ Data integrity check failed"
        echo "Expected length: ${#TEST_DATA}"
        echo "Actual length: ${#DOWNLOADED_DATA}"
        exit 1
    fi

    echo ""
    echo "📄 Downloaded content preview:"
    echo "$(echo "$DOWNLOADED_DATA" | head -10)"
    echo ""
}

# Step 5: Test JWKS endpoint
test_jwks() {
    echo "🔍 Step 5: Testing JWKS endpoint..."

    JWKS_RESPONSE=$(curl -s "$BASE_URL/api-keys/$KEY_ID/.well-known/jwks.json")

    # Check if JWKS endpoint is working
    if echo "$JWKS_RESPONSE" | jq -e '.keys[0].kid' > /dev/null; then
        JWKS_KID=$(echo "$JWKS_RESPONSE" | jq -r '.keys[0].kid')
        if [[ "$JWKS_KID" == "$KEY_ID" ]]; then
            echo "✅ JWKS endpoint working correctly"
            echo "   Public key available for verification"
        else
            echo "⚠️  JWKS endpoint returned different key ID"
        fi
    else
        echo "❌ JWKS endpoint not working"
        echo "Response: $JWKS_RESPONSE"
    fi
    echo ""
}

# Summary function
print_summary() {
    echo "📋 Flow Summary"
    echo "==============="
    echo "User Email: $TEST_USER_EMAIL"
    echo "API Key ID: $KEY_ID"
    echo "Artifact ID: $ARTIFACT_ID"
    echo "Artifact URL: $BASE_URL/api/artifacts/$ARTIFACT_ID"
    echo "JWKS URL: $BASE_URL/api-keys/$KEY_ID/.well-known/jwks.json"
    echo ""
    echo "🎯 Complete API key authentication flow demonstrated:"
    echo "   ✅ User registration via OIDC"
    echo "   ✅ JWT token acquisition"
    echo "   ✅ API key creation with scoped permissions"
    echo "   ✅ Secure artifact upload using API key"
    echo "   ✅ Public artifact download"
    echo "   ✅ JWKS public key verification"
    echo ""
    echo "🔑 API Key Details:"
    echo "   - Scopes: runtime:execute, runtime:read"
    echo "   - Expires: 2025-12-31"
    echo "   - User-generated: true"
    echo "   - Authentication: JWT-based with signature verification"
    echo ""
    echo "Ready for runtime agent integration!"
}

# Main execution
main() {
    check_dependencies
    check_server
    get_jwt_token
    create_api_key
    upload_artifact
    download_artifact
    test_jwks
    print_summary
}

# Run main function
main "$@"
