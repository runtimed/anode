# Deployment Guide

This document describes how to deploy Anode using the unified all-in-one worker
architecture that serves both the web client and backend API from a single
Cloudflare Worker.

## Architecture Overview

- **All-in-one Worker**: Single worker serving both frontend assets and backend API
- **D1 Database**: Persistent storage for LiveStore events
- **R2 Bucket**: Artifact storage for large outputs (images, files, data)
- **Durable Objects**: WebSocket server for real-time sync

The unified architecture simplifies deployment while providing artifact storage
for large notebook outputs that exceed the event size threshold.

## Prerequisites

- Cloudflare account with Workers, D1, and R2 access
- D1 database created for production
- R2 bucket created for artifact storage
- Wrangler CLI installed and authenticated

## Quick Start

Deploy the all-in-one worker with one command:

```bash
pnpm deploy  # Builds and deploys unified worker
```

This will:

1. Build the web client for production
2. Deploy the unified worker serving both frontend and backend
3. Configure D1 database and R2 bucket bindings

## Deployment Steps

### Option 1: Deploy Unified Worker (Recommended)

Deploy the all-in-one worker with a single command:

```bash
# Deploy unified worker
pnpm deploy
```

This builds the web client and deploys the unified worker to Cloudflare.

### Option 2: Deploy to Specific Environment

**Deploy to Production:**

```bash
wrangler deploy --env production
```

**Deploy to Preview:**

```bash
wrangler deploy --env preview
```

### Option 3: Manual Deployment

**1. Build the Web Client**

```bash
pnpm build
```

**2. Deploy the Unified Worker**

The unified worker serves both the web client and backend API, including
artifact storage endpoints.

```bash
wrangler deploy --env production
```

This deploys to: `https://app.runt.run` (production) or your configured domain.

**Required secrets:**

```bash
echo "your-secure-token" | pnpm wrangler secret put AUTH_TOKEN --env production
echo "your-google-client-secret" | pnpm wrangler secret put GOOGLE_CLIENT_SECRET --env production
```

## Environment Variables

### Unified Worker Environment Variables

Set in `wrangler.toml`:

- `DEPLOYMENT_ENV`: `"production"`
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `ARTIFACT_STORAGE`: `"r2"`
- `ARTIFACT_THRESHOLD`: `"16384"` (16KB threshold for artifact storage)
- `AUTH_TOKEN`: Set via secrets (see above)
- `GOOGLE_CLIENT_SECRET`: Set via secrets (see above)

### Web Client Build Variables

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

      - name: Build web client
        run: pnpm build

      - name: Deploy unified worker
        run: wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Manual Wrangler Commands

For manual deployment to different environments:

```bash
# Deploy to production
wrangler deploy --env production

# Deploy to preview
wrangler deploy --env preview

# Deploy with local development (no environment)
wrangler deploy
```

## Infrastructure Setup

### Create D1 Database

```bash
# Create production database
pnpm wrangler d1 create anode-main-prod-db

# Create preview database
pnpm wrangler d1 create anode-docworker-preview-db
```

Update `wrangler.toml` with the returned database IDs.

### Create R2 Bucket

```bash
# Create production artifact bucket
pnpm wrangler r2 bucket create anode-artifacts-prod

# Create preview artifact bucket
pnpm wrangler r2 bucket create anode-artifacts-preview
```

### Set Required Secrets

```bash
# Production secrets
echo "your-secure-token" | pnpm wrangler secret put AUTH_TOKEN --env production
echo "your-google-client-secret" | pnpm wrangler secret put GOOGLE_CLIENT_SECRET --env production

# Preview secrets
echo "your-preview-token" | pnpm wrangler secret put AUTH_TOKEN --env preview
echo "your-google-client-secret" | pnpm wrangler secret put GOOGLE_CLIENT_SECRET --env preview
```

## Troubleshooting

### Deployment Issues

| Problem               | Solution                                        |
| --------------------- | ----------------------------------------------- |
| Missing database ID   | Create D1 database and update `wrangler.toml`   |
| Missing R2 bucket     | Create R2 bucket and update `wrangler.toml`     |
| Authentication errors | Set required secrets with `wrangler secret put` |
| Build failures        | Run `pnpm build` locally to check for errors    |

### Artifact Storage Issues

| Problem                   | Solution                                             |
| ------------------------- | ---------------------------------------------------- |
| Large outputs not storing | Check R2 bucket configuration and ARTIFACT_THRESHOLD |
| Artifact fetch failures   | Verify R2 bucket permissions and CORS settings       |
| Upload authentication     | Ensure AUTH_TOKEN is set correctly                   |

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
