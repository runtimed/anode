# Deployment Guide

This document describes how to deploy Anode using the split architecture with
Cloudflare Pages for the web client and Cloudflare Workers for the sync backend.

## Architecture Overview

- **Cloudflare Pages**: Serves the web client (React app)
- **Cloudflare Workers**: Handles LiveStore sync backend with Durable Objects
  and D1

This separation is necessary because Cloudflare Workers don't support WebSocket
client connections from Web Workers, which LiveStore requires.

## Prerequisites

- Cloudflare account with Pages and Workers access
- D1 database created for production
- Wrangler CLI installed and authenticated

## Quick Start

Deploy both services with one command:

```bash
pnpm deploy  # Deploys both web client and worker
```

This will:

1. Build the web client for production
2. Deploy both the sync worker and web client to Cloudflare

## Deployment Steps

### Option 1: Deploy Both Services (Recommended)

Deploy both the sync backend and web client with a single command:

```bash
# Deploy both services
pnpm deploy
```

This builds the web client and deploys both services to Cloudflare.

### Option 2: Deploy Services Individually

**Deploy the Sync Backend (Worker):**

```bash
pnpm deploy:worker
```

**Deploy the Web Client (Pages):**

```bash
pnpm deploy:web
```

### Option 3: Manual Deployment

**1. Deploy the Sync Backend (Worker)**

The sync backend runs on Cloudflare Workers and handles LiveStore
synchronization.

```bash
wrangler deploy --env production
```

This deploys to: `https://anode-docworker.rgbkrk.workers.dev`

**Required secrets:**

```bash
echo "your-secure-token" | pnpm wrangler secret put AUTH_TOKEN --env production
```

**2. Deploy the Web Client (Pages)**

The web client is served from Cloudflare Pages with static assets.

```bash
pnpm build && wrangler pages deploy dist --project-name anode
```

## Environment Variables

### Worker Environment Variables

Set in `wrangler.toml`:

- `DEPLOYMENT_ENV`: `"production"`
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `AUTH_TOKEN`: Set via secrets (see above)

### Web Client Environment Variables

Web client environment variables are built into the static assets at build time:

- **Production**: Set in `.env.production` or Cloudflare Pages environment
  settings
- **Development**: Set in `.env` or `.env.development`

Key variables:

- `VITE_LIVESTORE_SYNC_URL`: URL of the sync worker
- `VITE_AUTH_TOKEN`: Authentication token for the sync backend

## Local Development

For local development, you can run both services locally:

1. **Start the sync backend:**
   ```bash
   pnpm dev:sync
   ```

2. **Start the web client:**
   ```bash
   pnpm dev
   ```

The web client will connect to `ws://localhost:8787/api` for local development.

## Automated Deployment

### GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy to Cloudflare
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "23"

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: latest

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test --run

      - name: Deploy worker
        run: pnpm deploy:worker
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Deploy web client
        run: pnpm deploy:web
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Cloudflare Pages Git Integration

Alternatively, you can connect the repository directly to Cloudflare Pages:

1. Go to Cloudflare Pages dashboard
2. Connect to Git repository
3. Set build settings:
   - **Build command**: `pnpm build:prod`
   - **Build output directory**: `dist`
   - **Root directory**: Leave empty
4. Environment variables are configured in `wrangler.toml`

## Troubleshooting

### WebSocket Connection Issues

If you see errors like "URL scheme 'wss' is not supported", ensure:

1. Web client is deployed to Pages (not Workers)
2. Sync backend is deployed to Workers
3. `VITE_LIVESTORE_SYNC_URL` points to the Worker URL with `wss://` protocol

### CORS Issues

If you encounter CORS errors, check that the Worker is configured to allow
requests from the Pages domain.

### Authentication Issues

Ensure `AUTH_TOKEN` secret is set on the Worker and matches the client
configuration.

## URLs

- **Production Web Client**: https://anode.pages.dev
- **Production Sync Backend**: https://anode-docworker.rgbkrk.workers.dev
- **Local Web Client**: http://localhost:5173
- **Local Sync Backend**: http://localhost:8787
