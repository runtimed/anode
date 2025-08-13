# Deployment Guide

This document describes how to deploy Anode using the unified all-in-one worker
architecture that serves both the web client and backend API from a single
Cloudflare Worker.

**Current Status**: Anode is deployed and accessible at **https://app.runt.run** using this unified architecture.

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

Deploy the all-in-one worker to production:

```bash
pnpm deploy:production  # Builds and deploys unified worker to production
```

Or to preview environment:

```bash
pnpm deploy:preview  # Builds and deploys unified worker to preview
```

This will:

1. Build the web client for production using Vite
2. Deploy the unified worker serving both frontend and backend
3. Configure D1 database and R2 bucket bindings
4. Use existing `wrangler.toml` configuration for the specified environment

## Deployment Steps

### Option 1: Deploy Using Scripts (Recommended)

The easiest way to deploy is using the provided scripts:

```bash
# Deploy to production
pnpm deploy:production

# Deploy to preview
pnpm deploy:preview
```

These scripts handle the build process and use the correct environment configuration from `wrangler.toml`.

### Option 2: Manual Deployment

**1. Build the Web Client**

```bash
# Build for our deployed production environment
pnpm build:production

# Or build for preview
pnpm build:preview
```

**2. Deploy the Unified Worker**

The unified worker serves both the web client and backend API, including
artifact storage endpoints.

```bash
# Deploy to production
pnpm wrangler deploy --env production

# Deploy to preview
pnpm wrangler deploy --env preview
```

**Production deploys to**: `https://app.runt.run`
**Preview deploys to**: `https://preview.runt.run`

**Required secrets:**

```bash
# Production secrets
echo "your-secure-token" | pnpm wrangler secret put AUTH_TOKEN --env production

# Preview secrets
echo "your-preview-token" | pnpm wrangler secret put AUTH_TOKEN --env preview
```

## Environment Variables

### Unified Worker Environment Variables

Set in `wrangler.toml`:

- `DEPLOYMENT_ENV`: `"production"`
- `AUTH_ISSUER`: Your OIDC issuer URL (e.g., `https://your-auth-provider.com`)
- `EXTENSION_CONFIG`: A JSON encoded string of extra data to pass into the backend extension
- `ARTIFACT_STORAGE`: `"r2"`
- `ARTIFACT_THRESHOLD`: `"16384"` (16KB threshold for artifact storage)
- `AUTH_TOKEN`: Set via secrets (see above)

### Web Client Build Variables

Web client environment variables are built into the static assets at build time:

- **Production**: Set in `.env.production` or Cloudflare Pages environment
  settings
- **Development**: Set in `.env` or `.env.development`

Key variables:

- `VITE_LIVESTORE_SYNC_URL`: URL of the sync worker

## Local Development

For local development, use the integrated development server:

```bash
pnpm dev
```

This starts the unified development server that serves both the web client and backend API using the Vite Cloudflare plugin. The server runs at `http://localhost:5173` and handles both frontend assets and backend API requests.

For Python execution, start the runtime agent:

```bash
# Get the notebook ID from the UI, then run:
NOTEBOOK_ID=your-notebook-id pnpm dev:runtime
```

The development server is stable and handles hot reload for most changes. Environment file changes are ignored to prevent crashes.

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

# Preview secrets
echo "your-preview-token" | pnpm wrangler secret put AUTH_TOKEN --env preview
```

## Troubleshooting

### Deployment Issues

| Problem                   | Solution                                                         |
| ------------------------- | ---------------------------------------------------------------- |
| Missing database ID       | Create D1 database and update `wrangler.toml`                    |
| Missing R2 bucket         | Create R2 bucket and update `wrangler.toml`                      |
| Authentication errors     | Set required secrets with `wrangler secret put`                  |
| Build failures            | Run `pnpm build:production` locally to check for errors          |
| Environment config errors | Use `pnpm deploy:production` instead of direct wrangler commands |

### Artifact Storage Issues

| Problem                   | Solution                                             |
| ------------------------- | ---------------------------------------------------- |
| Large outputs not storing | Check R2 bucket configuration and ARTIFACT_THRESHOLD |
| Artifact fetch failures   | Verify R2 bucket permissions and CORS settings       |
| Upload authentication     | Ensure AUTH_TOKEN is set correctly                   |

### WebSocket Connection Issues

If you see WebSocket connection errors:

1. Ensure the unified worker is deployed and accessible
2. Check that `VITE_LIVESTORE_SYNC_URL` points to the correct worker URL
3. Verify authentication tokens are set correctly

### CORS Issues

The unified worker handles CORS automatically since it serves both frontend and backend from the same origin.

### Authentication Issues

Ensure `AUTH_TOKEN` secret is set on the Worker:

```bash
echo "your-secure-token" | pnpm wrangler secret put AUTH_TOKEN --env production
```

### Development Server Issues

If the development server crashes:

1. Restart with `pnpm dev`
2. Environment file changes are ignored to prevent crashes
3. Check that Node.js version is >=23.0.0

## URLs

- **Production (All-in-one)**: https://app.runt.run
- **Preview (All-in-one)**: https://preview.runt.run
- **Local Development**: http://localhost:5173

The unified architecture serves both frontend and backend from a single URL, simplifying deployment and eliminating CORS issues.

## Iframe Outputs Service

Anode uses a separate domain (`runtusercontent.com`) to securely render user-generated HTML and SVG content in iframes. This provides security isolation from the main application domain.

### Deploy Iframe Outputs

The iframe outputs service is a simple Cloudflare Worker that serves the iframe content handler with appropriate security headers.

**Quick deployment:**

```bash
# Deploy to production (runtusercontent.com)
./scripts/deploy-iframe-outputs.sh production

# Deploy to preview (preview.runtusercontent.com)
./scripts/deploy-iframe-outputs.sh preview
```

**Manual deployment:**

```bash
cd iframe-outputs
pnpm deploy:production  # or deploy:preview
```

### Iframe Service URLs

- **Production**: https://runtusercontent.com
- **Preview**: https://preview.runtusercontent.com
- **Local Development**: http://localhost:8000

### Environment Configuration

The main application must have `VITE_IFRAME_OUTPUT_URI` set to the appropriate iframe service URL:

- In `wrangler.toml` for the main worker environments
- In `.env` files for local development

This is already configured in the provided `wrangler.toml` for production and preview environments.

### DNS Setup

Ensure DNS for `runtusercontent.com` and its subdomains are configured in Cloudflare to point to the deployed workers.
