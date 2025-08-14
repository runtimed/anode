# API Key System Documentation

This document describes the comprehensive API key system implemented in Anode, which provides unified API key management for both local development and production environments.

## Overview

The API key system allows users to create, manage, and use API keys for authentication instead of OAuth tokens. It supports two different backends:

- **Local Provider**: Uses japikey library for development environments
- **Anaconda Provider**: Integrates with Anaconda's API key service for production

## Architecture

The system is designed with a unified interface that abstracts provider-specific implementations:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Routes    │ -> │  ApiKeyProvider  │ -> │ Local/Anaconda  │
│                 │    │   (Interface)    │    │   Providers     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Key Components

- **`ApiKeyProvider`**: Common interface for all providers
- **`LocalApiKeyProvider`**: Development implementation using japikey
- **`AnacondaApiKeyProvider`**: Production implementation for Anaconda
- **Unified API routes**: Same HTTP interface regardless of provider
- **Shared validation**: Common request/response validation
- **Error handling**: Centralized error responses

## Configuration

The system automatically selects the appropriate provider based on the `SERVICE_PROVIDER` environment variable:

```bash
# Local development (default)
SERVICE_PROVIDER=local

# Production with Anaconda
SERVICE_PROVIDER=anaconda
EXTENSION_CONFIG='{"apiKeyUrl":"https://api.anaconda.com/v2/api-keys","userinfoUrl":"https://api.anaconda.com/v2/whoami"}'
```

## API Endpoints

All endpoints are available at `/api/api-keys` and follow RESTful conventions.

### Create API Key

**Endpoint**: `POST /api/api-keys`  
**Authentication**: OAuth token required (API keys cannot create other API keys)

**Request Body**:
```json
{
  "scopes": ["runt:read", "runt:execute"],
  "resources": [
    {
      "id": "notebook-123", 
      "type": "notebook"
    }
  ],
  "expiresAt": "2025-12-31T23:59:59Z",
  "name": "My API Key",
  "userGenerated": true
}
```

**Response**:
```json
{
  "api_key": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."
}
```

### Get API Key

**Endpoint**: `GET /api/api-keys/{id}`  
**Authentication**: OAuth token or API key

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "scopes": ["runt:execute"],
  "resources": [],
  "expiresAt": "2025-12-31T23:59:59Z",
  "name": "My API Key",
  "userGenerated": true,
  "revoked": false
}
```

### List API Keys

**Endpoint**: `GET /api/api-keys`  
**Authentication**: OAuth token or API key  
**Query Parameters**: `limit`, `offset` (for pagination)

**Response**:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-123",
    "scopes": ["runt:execute"],
    "expiresAt": "2025-12-31T23:59:59Z",
    "name": "My API Key",
    "userGenerated": true,
    "revoked": false
  }
]
```

### Revoke API Key (if supported)

**Endpoint**: `PATCH /api/api-keys/{id}`  
**Authentication**: OAuth token or API key

**Request Body**:
```json
{
  "revoked": true
}
```

**Response**: Updated API key object

### Delete API Key

**Endpoint**: `DELETE /api/api-keys/{id}`  
**Authentication**: OAuth token or API key

**Response**: `204 No Content`

## Scopes

The system supports the following scopes:

- `runt:read`: Read-only access to resources
- `runt:execute`: Permission to execute code and modify resources

### Scope Mapping

Internal scopes are mapped to provider-specific scopes:

| Internal Scope | Anaconda Scope |
|---------------|----------------|
| `runt:read`   | `cloud:read`   |
| `runt:execute`| `cloud:write`  |

## Authentication Flow

### Using API Keys

1. Create an API key using OAuth authentication
2. Extract the JWT token from the response
3. Use the JWT token in the `Authorization: Bearer <token>` header
4. The system automatically detects and validates API key tokens

### Authentication Priority

When a request includes a bearer token:

1. Check if token appears to be an API key (based on JWT structure)
2. If yes, validate using the appropriate API key provider
3. If no, fall back to OAuth/service token validation

## Error Handling

All errors follow a consistent JSON structure:

```json
{
  "error": {
    "type": "invalid_request",
    "message": "Human-readable error message", 
    "data": {
      "additional": "context"
    },
    "debug": {
      "stack": "...",
      "underlying": {...}
    }
  }
}
```

### Common Error Types

- `missing_token`: No authentication provided
- `invalid_token`: Token is malformed or expired
- `access_denied`: Insufficient permissions
- `not_found`: Resource doesn't exist
- `invalid_request`: Bad request data
- `capability_not_available`: Operation not supported by provider

## Provider Differences

### Local Provider (Development)

- Uses japikey library for key management
- Stores keys in local D1 database
- Supports full CRUD operations
- JWT keys with UUID-based key IDs
- Synthetic user IDs for local development

**Capabilities**:
- ✅ Create, Read, Update, Delete
- ❌ Revoke (not supported by japikey)

### Anaconda Provider (Production)

- Integrates with Anaconda API key service
- Maps scopes between internal and Anaconda formats
- Validates tokens via Anaconda's whoami endpoint
- Limited by Anaconda API capabilities

**Capabilities**:
- ✅ Create, Read, Delete
- ❌ Revoke (not supported by Anaconda)
- ❌ Update (not supported by Anaconda)

## Testing

A comprehensive test script is provided at `scripts/test-api-keys.sh`:

```bash
# Test with default configuration
./scripts/test-api-keys.sh "your-oauth-token"

# Test against local development
./scripts/test-api-keys.sh "your-token" "http://localhost:8787"

# Test with custom scopes
API_KEY_SCOPES='["runt:read"]' ./scripts/test-api-keys.sh "your-token"
```

The script tests the complete lifecycle:
1. Authentication validation
2. API key creation
3. Key listing and retrieval
4. Optional revocation testing
5. Key deletion
6. Verification of deletion

## Development Workflow

### Local Development Setup

1. Set up the development environment:
   ```bash
   pnpm install
   cp .env.example .env
   cp .dev.vars.example .dev.vars
   ```

2. Configure for local provider:
   ```bash
   # In .dev.vars
   SERVICE_PROVIDER=local
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

4. Test API key creation:
   ```bash
   # Get OAuth token from development OIDC
   # Then test API keys
   ./scripts/test-api-keys.sh "your-dev-token" "http://localhost:8787"
   ```

### Production Deployment

1. Configure environment variables:
   ```bash
   SERVICE_PROVIDER=anaconda
   EXTENSION_CONFIG='{"apiKeyUrl":"https://api.anaconda.com/v2/api-keys","userinfoUrl":"https://api.anaconda.com/v2/whoami"}'
   ```

2. Deploy to Cloudflare:
   ```bash
   pnpm deploy
   ```

3. Test with production OAuth tokens:
   ```bash
   ./scripts/test-api-keys.sh "production-token" "https://app.runt.run"
   ```

## Security Considerations

### Authentication Requirements

- **API key creation**: Requires OAuth token (prevents API keys from creating other API keys)
- **Other operations**: Accept both OAuth tokens and API keys
- **Ownership verification**: All operations verify the user owns the API key

### Token Validation

- JWT signature verification for API keys
- Scope-based access control
- Expiration time enforcement
- Provider-specific validation (Anaconda whoami, japikey verification)

### Error Information

- Detailed debug information only in development (`DEBUG=true`)
- Production errors include minimal information to prevent information leakage
- All errors logged server-side for debugging

## Troubleshooting

### Common Issues

1. **"API key management not available"**
   - Check `SERVICE_PROVIDER` environment variable
   - Verify provider configuration (EXTENSION_CONFIG for Anaconda)

2. **"Authentication method not allowed"**
   - API key creation requires OAuth token, not API key
   - Use proper authentication for the operation

3. **"Invalid API key format"**
   - Check JWT structure and issuer
   - Verify the token hasn't been truncated

4. **Provider initialization failures**
   - Local: Check D1 database binding
   - Anaconda: Verify EXTENSION_CONFIG JSON format and required fields

### Debugging

1. Check the health endpoint: `GET /api/health`
2. Test authentication: `POST /api/debug/auth`
3. Enable debug mode: `DEBUG=true`
4. Check provider configuration in health response

## Future Enhancements

- **Resource-based access control**: Fine-grained permissions per notebook/resource
- **Key rotation**: Automatic key rotation capabilities
- **Usage analytics**: Track API key usage patterns
- **Rate limiting**: Per-key rate limiting
- **Webhook notifications**: Notify on key creation/deletion
- **Bulk operations**: Create/delete multiple keys at once
- **Key templates**: Predefined key configurations