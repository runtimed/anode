# Local Auth Testing with Production Configuration

This guide explains how to test OAuth authentication locally using production credentials.

## Overview

The Anode auth system supports two modes:

- **Production mode**: Uses OIDC OAuth with production issuer
- **Development mode**: Uses direct token authentication

For testing auth improvements and session management, you'll want to use production mode _locally_.

## Setup

First, set up a `.env.production` file with the following variables:

```
VITE_LIVESTORE_SYNC_URL=wss://anode-docworker.rgbkrk.workers.dev/api

# You can change this to any runtime agent command, so long as it has access to its own auth token
VITE_RUNTIME_COMMAND="deno run --allow-all --env-file=.env jsr:@runt/pyodide-runtime-agent@^0.8.0"
```

Run the development server with production environment variables (using `.env.production`):

```bash
pnpm dev:prod
```

This command:

- Starts the local development server at `http://localhost:5173`.
- Uses production environment variables (including OIDC issuer).
- Connects to the production sync worker.
- Enables hot reloading for local development.

**Note**: `.env.local` takes precedence over other environment files and is gitignored.

## What You Get

### Production Auth Locally

- Real OIDC OAuth sign-in flow.
- Production OIDC issuer configuration.
- 7-day session cookies.

### Production Sync Backend

- No need to run `pnpm dev:sync` locally.
- Uses production Cloudflare Worker for sync.
- Real-time collaboration with production infrastructure.

## Testing Auth Improvements

### 1. Session Persistence

- Sign in once.
- Should stay logged in across:
  - Page refreshes.
  - Browser tab closures.
  - Browser restarts (for up to 7 days).

## Environment Variables

Required for production auth testing:

```bash
VITE_AUTH_ISSUER="https://your-oauth-provider.com"
VITE_CLIENT_ID="your-oauth-client-id"
```

The production OIDC issuer must have `http://localhost:5173` configured in:

- **Authorized JavaScript origins**.
- **Authorized redirect URIs** (if applicable).

## Commands Summary

```bash
# Test with production auth (recommended)
pnpm dev:prod

# Test with token auth
pnpm dev
```

The `pnpm dev:prod` approach is the cleanest way to test auth improvements while maintaining a fast local development workflow.
