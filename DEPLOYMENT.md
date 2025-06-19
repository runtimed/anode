# Deployment Guide

This document describes how to deploy Anode using the split architecture with Cloudflare Pages for the web client and Cloudflare Workers for the sync backend.

## Architecture Overview

- **Cloudflare Pages**: Serves the web client (React app)
- **Cloudflare Workers**: Handles LiveStore sync backend with Durable Objects and D1

This separation is necessary because Cloudflare Workers don't support WebSocket client connections from Web Workers, which LiveStore requires.

## Prerequisites

- Cloudflare account with Pages and Workers access
- D1 database created for production
- Wrangler CLI installed and authenticated

## Deployment Steps

### 1. Deploy the Sync Backend (Worker)

The sync backend runs on Cloudflare Workers and handles LiveStore synchronization.

```bash
cd packages/docworker
pnpm wrangler deploy --env production
```

This deploys to: `https://anode-docworker.rgbkrk.workers.dev`

**Required secrets:**
```bash
echo "your-secure-token" | pnpm wrangler secret put AUTH_TOKEN --env production
```

### 2. Deploy the Web Client (Pages)

The web client is served from Cloudflare Pages with static assets.

```bash
cd packages/web-client

# Build for production
pnpm build

# Deploy to Pages (uses wrangler.toml configuration)
pnpm wrangler pages deploy dist --project-name anode --commit-dirty=true
```

## Environment Variables

### Worker Environment Variables

Set in `packages/docworker/wrangler.toml`:

- `DEPLOYMENT_ENV`: `"production"`
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `AUTH_TOKEN`: Set via secrets (see above)

### Pages Environment Variables

Pages environment variables are configured in `packages/web-client/wrangler.toml`:

- **Production** (`[vars]` section): Points to production worker
- **Preview** (`[env.preview.vars]` section): Points to local development server

The web client also supports `.env` files for local development overrides.

## Local Development

For local development, you can run both services locally:

1. **Start the sync backend:**
   ```bash
   cd packages/docworker
   pnpm wrangler dev
   ```

2. **Start the web client:**
   ```bash
   cd packages/web-client
   pnpm dev
   ```

The web client will connect to `ws://localhost:8787/api` for local development.

## Automated Deployment

### GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Anode

on:
  push:
    branches: [main]

jobs:
  deploy-worker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install
      - run: cd packages/docworker && pnpm wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  deploy-pages:
    runs-on: ubuntu-latest
    needs: deploy-worker
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install
      - run: cd packages/web-client && pnpm build
      - run: cd packages/web-client && pnpm wrangler pages deploy dist --project-name anode
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Cloudflare Pages Git Integration

Alternatively, you can connect the repository directly to Cloudflare Pages:

1. Go to Cloudflare Pages dashboard
2. Connect to Git repository
3. Set build settings:
   - **Build command**: `cd packages/web-client && pnpm build`
   - **Build output directory**: `packages/web-client/dist`
   - **Root directory**: Leave empty
4. Environment variables are configured in `wrangler.toml`

## Troubleshooting

### WebSocket Connection Issues

If you see errors like "URL scheme 'wss' is not supported", ensure:

1. Web client is deployed to Pages (not Workers)
2. Sync backend is deployed to Workers
3. `VITE_LIVESTORE_SYNC_URL` points to the Worker URL with `wss://` protocol

### CORS Issues

If you encounter CORS errors, check that the Worker is configured to allow requests from the Pages domain.

### Authentication Issues

Ensure `AUTH_TOKEN` secret is set on the Worker and matches the client configuration.

## URLs

- **Production Web Client**: https://anode.pages.dev
- **Production Sync Backend**: https://anode-docworker.rgbkrk.workers.dev
- **Local Web Client**: http://localhost:5173
- **Local Sync Backend**: http://localhost:8787