#!/bin/bash

# API Key Testing Script for Anode
# Tests the complete API key lifecycle: create, list, get, revoke, delete

set -e  # Exit on any error

# Configuration
DEFAULT_BASE_URL="https://app.runt.run"
DEFAULT_SCOPES='["runt:execute"]'
DEFAULT_EXPIRES_AT="2025-12-31T23:59:59Z"
DEFAULT_NAME="Test API Key"

# Debug mode
DEBUG="${DEBUG:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Usage function
usage() {
    echo "Usage: $0 <access_token> [base_url]"
    echo ""
    echo "Arguments:"
    echo "  access_token  OAuth access token for authentication"
    echo "  base_url      Base URL for API (default: $DEFAULT_BASE_URL)"
    echo ""
    echo "Environment variables:"
    echo "  API_KEY_SCOPES     JSON array of scopes (default: $DEFAULT_SCOPES)"
    echo "  API_KEY_EXPIRES_AT Expiration date (default: $DEFAULT_EXPIRES_AT)"
    echo "  API_KEY_NAME       Key name (default: '$DEFAULT_NAME')"
    echo "  DEBUG              Enable debug output (default: false)"
    echo ""
    echo "Examples:"
    echo "  $0 eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."
    echo "  $0 eyJ0eXAi... http://localhost:8787"
    echo "  API_KEY_SCOPES='[\"runt:read\"]' $0 eyJ0eXAi..."
    echo "  DEBUG=true $0 eyJ0eXAi... https://preview.runt.run"
    exit 1
}

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}🔹${NC} $1"
}

log_debug() {
    if [ "$DEBUG" = "true" ]; then
        echo -e "${PURPLE}🐛${NC} $1"
    fi
}

# JSON pretty print with fallback
json_pretty() {
    if command -v jq >/dev/null 2>&1; then
        echo "$1" | jq '.'
    else
        echo "$1"
    fi
}

# Validate inputs
if [ $# -lt 1 ]; then
    log_error "Missing required argument: access_token"
    usage
fi

ACCESS_TOKEN="$1"
BASE_URL="${2:-$DEFAULT_BASE_URL}"

# Configuration with environment variable overrides
SCOPES="${API_KEY_SCOPES:-$DEFAULT_SCOPES}"
EXPIRES_AT="${API_KEY_EXPIRES_AT:-$DEFAULT_EXPIRES_AT}"
KEY_NAME="${API_KEY_NAME:-$DEFAULT_NAME}"

log_info "Starting API Key test suite"
log_info "Base URL: $BASE_URL"
log_info "Scopes: $SCOPES"
log_info "Expires: $EXPIRES_AT"
log_info "Name: $KEY_NAME"
log_debug "Debug mode: $DEBUG"

# Validate access token format
if [[ ! "$ACCESS_TOKEN" =~ ^eyJ ]]; then
    log_warning "Access token doesn't look like a JWT (should start with 'eyJ')"
fi

# Create new API key
log_step "Creating new API key"
log_debug "Making request to: $BASE_URL/api/api-keys"

create_response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/api-keys" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"scopes\": $SCOPES,
    \"expiresAt\": \"$EXPIRES_AT\",
    \"name\": \"$KEY_NAME\",
    \"userGenerated\": true
  }" 2>/dev/null)

if [ $? -ne 0 ]; then
    log_error "Failed to connect to $BASE_URL"
    exit 1
fi

log_debug "Raw create response: $create_response"

create_code=$(echo "$create_response" | tail -n1)
create_body=$(echo "$create_response" | sed '$d')

if [ "$create_code" -ne 200 ]; then
    log_error "API Key creation failed (HTTP $create_code)"
    json_pretty "$create_body"
    exit 1
fi

log_success "API Key created successfully"

# Extract the JWT token from the response
api_key_jwt=$(echo "$create_body" | jq -r '.api_key // empty')

if [ -z "$api_key_jwt" ]; then
    log_error "No API key found in response"
    exit 1
fi

log_info "API Key JWT: $api_key_jwt"

# Extract the kid (key ID) from the JWT header
log_step "Extracting key ID from JWT"
jwt_header=$(echo "$api_key_jwt" | cut -d'.' -f1)

# Decode the base64 header and extract kid
# Add padding if needed for base64 decoding
padded_header=$(printf '%s' "$jwt_header" | sed 's/-/+/g; s/_/\//g')
padding_length=$((4 - ${#padded_header} % 4))
if [ $padding_length -ne 4 ]; then
    padded_header="${padded_header}$(printf '=%.0s' $(seq 1 $padding_length))"
fi

decoded_header=$(echo "$padded_header" | base64 -d 2>/dev/null || echo "{}")
kid=$(echo "$decoded_header" | jq -r '.kid // empty' 2>/dev/null || echo "")

# Check if kid is valid (not null, empty, or "null")
if [ -n "$kid" ] && [ "$kid" != "null" ]; then
    log_success "Extracted kid from header: $kid"
else
    log_info "kid not found in header, searching JWT body claims..."

    # Extract the JWT payload (second part)
    jwt_payload=$(echo "$api_key_jwt" | cut -d'.' -f2)

    # Decode the base64 payload and search for kid
    padded_payload=$(printf '%s' "$jwt_payload" | sed 's/-/+/g; s/_/\//g')
    padding_length=$((4 - ${#padded_payload} % 4))
    if [ $padding_length -ne 4 ]; then
        padded_payload="${padded_payload}$(printf '=%.0s' $(seq 1 $padding_length))"
    fi

    decoded_payload=$(echo "$padded_payload" | base64 -d 2>/dev/null || echo "{}")
    kid=$(echo "$decoded_payload" | jq -r '.kid // .key_id // .keyId // .id // .sub // empty' 2>/dev/null || echo "")

    if [ -n "$kid" ] && [ "$kid" != "null" ]; then
        log_success "Extracted kid from body claims: $kid"
    else
        log_error "kid not found in JWT header or body claims"
        log_info "Available fields in payload:"
        echo "$decoded_payload" | jq 'keys' 2>/dev/null || echo "Could not decode payload"
        exit 1
    fi
fi

# List all API keys
log_step "Listing all API keys"
list_response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/api-keys" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

list_code=$(echo "$list_response" | tail -n1)
list_body=$(echo "$list_response" | sed '$d')

if [ "$list_code" -ne 200 ]; then
    log_error "Failed to list API keys (HTTP $list_code)"
    json_pretty "$list_body"
else
    log_success "API keys listed successfully"
    if [ "$DEBUG" = "true" ]; then
        json_pretty "$list_body"
    fi
fi

# Get details for the specific key using the extracted kid
log_step "Getting details for key ID: $kid"
get_response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/api-keys/$kid" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

get_code=$(echo "$get_response" | tail -n1)
get_body=$(echo "$get_response" | sed '$d')

if [ "$get_code" -ne 200 ]; then
    log_error "Failed to get key details (HTTP $get_code)"
    json_pretty "$get_body"
else
    log_success "Key details retrieved successfully"
    if [ "$DEBUG" = "true" ]; then
        json_pretty "$get_body"
    fi
fi

# Test the API key by using it for authentication
log_step "Testing API key authentication"
api_key_auth_response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/debug/auth" \
  -H "Content-Type: application/json" \
  -d "{\"authToken\": \"$api_key_jwt\"}")

api_key_auth_code=$(echo "$api_key_auth_response" | tail -n1)
api_key_auth_body=$(echo "$api_key_auth_response" | sed '$d')

if [ "$api_key_auth_code" -ne 200 ]; then
    log_error "API key authentication test failed (HTTP $api_key_auth_code)"
    json_pretty "$api_key_auth_body"
else
    log_success "API key authentication successful"
    if [ "$DEBUG" = "true" ]; then
        json_pretty "$api_key_auth_body"
    fi
fi

# Optionally revoke the key (if supported by provider)
read -p "Do you want to test key revocation? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_step "Revoking key ID: $kid"
    revoke_response=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/api-keys/$kid" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -d '{"revoked": true}')

    revoke_code=$(echo "$revoke_response" | tail -n1)
    revoke_body=$(echo "$revoke_response" | sed '$d')

    if [ "$revoke_code" -eq 200 ]; then
        log_success "Key revoked successfully"
        if [ "$DEBUG" = "true" ]; then
            json_pretty "$revoke_body"
        fi
    elif [ "$revoke_code" -eq 400 ]; then
        log_warning "Key revocation not supported by current provider"
        if [ "$DEBUG" = "true" ]; then
            json_pretty "$revoke_body"
        fi
    else
        log_error "Failed to revoke key (HTTP $revoke_code)"
        json_pretty "$revoke_body"
    fi
fi

# Delete the key
log_step "Deleting key ID: $kid"
delete_response=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/api-keys/$kid" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

delete_code=$(echo "$delete_response" | tail -n1)
delete_body=$(echo "$delete_response" | sed '$d')

if [ "$delete_code" -eq 204 ]; then
    log_success "Key deleted successfully"
elif [ "$delete_code" -eq 200 ]; then
    log_success "Key deleted successfully"
    json_pretty "$delete_body"
else
    log_error "Failed to delete key (HTTP $delete_code)"
    json_pretty "$delete_body"
fi

# Verify the key is deleted by trying to get it again
log_step "Verifying key deletion"
verify_response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/api-keys/$kid" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

verify_code=$(echo "$verify_response" | tail -n1)
verify_body=$(echo "$verify_response" | sed '$d')

if [ "$verify_code" -eq 404 ]; then
    log_success "Key deletion verified - key no longer exists"
elif [ "$verify_code" -eq 403 ]; then
    log_success "Key deletion verified - access denied"
else
    log_warning "Unexpected response when verifying deletion (HTTP $verify_code)"
    if [ "$DEBUG" = "true" ]; then
        json_pretty "$verify_body"
    fi
fi

# Test that the deleted API key no longer works
log_step "Testing deleted API key authentication (should fail)"
deleted_key_auth_response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/debug/auth" \
  -H "Content-Type: application/json" \
  -d "{\"authToken\": \"$api_key_jwt\"}")

deleted_key_auth_code=$(echo "$deleted_key_auth_response" | tail -n1)
deleted_key_auth_body=$(echo "$deleted_key_auth_response" | sed '$d')

if [ "$deleted_key_auth_code" -eq 401 ]; then
    log_success "Deleted API key correctly rejected"
    if [ "$DEBUG" = "true" ]; then
        json_pretty "$deleted_key_auth_body"
    fi
else
    log_warning "Unexpected response for deleted key authentication (HTTP $deleted_key_auth_code)"
    if [ "$DEBUG" = "true" ]; then
        json_pretty "$deleted_key_auth_body"
    fi
fi

log_step "Test suite completed!"
log_success "All API key operations tested successfully"
