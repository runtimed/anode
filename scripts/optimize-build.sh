#!/bin/bash
# Build Optimization Script for Cloudflare Workers
# Optimizes caching and build performance for Anode deployment

set -euo pipefail

echo "🚀 Optimizing build for Cloudflare Workers deployment..."

# Check if we're in a CI environment
if [[ "${CI:-}" == "true" ]]; then
    echo "📦 CI environment detected"

    # Set npm/pnpm cache directories to be persistent
    export PNPM_CACHE_FOLDER="$HOME/.pnpm-cache"
    export NPM_CONFIG_CACHE="$HOME/.npm-cache"

    # Ensure cache directories exist
    mkdir -p "$PNPM_CACHE_FOLDER"
    mkdir -p "$NPM_CONFIG_CACHE"

    echo "💾 Cache directories configured:"
    echo "  PNPM: $PNPM_CACHE_FOLDER"
    echo "  NPM: $NPM_CONFIG_CACHE"
fi

# Pre-build optimizations
echo "⚡ Running pre-build optimizations..."

# Ensure pnpm store is optimized
if command -v pnpm &> /dev/null; then
    echo "🔧 Optimizing pnpm store..."
    pnpm store prune || true
    pnpm store path
fi

# Check for lockfile
if [[ ! -f "pnpm-lock.yaml" ]]; then
    echo "⚠️  Warning: pnpm-lock.yaml not found. Installing dependencies..."
    pnpm install
else
    echo "✅ Using frozen lockfile for deterministic builds"
fi

# Set build environment variables for optimization
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"

# Vite build optimizations
export VITE_BUILD_CACHE=true
export VITE_LEGACY_SUPPORT=false

echo "🏗️  Build environment configured:"
echo "  NODE_ENV: $NODE_ENV"
echo "  NODE_OPTIONS: $NODE_OPTIONS"
echo "  Max old space: 4096MB"

# Cache status check
echo "📊 Cache status:"
if command -v pnpm &> /dev/null; then
    echo "  PNPM store size: $(du -sh ~/.pnpm-store 2>/dev/null || echo 'Not found')"
fi

echo "✨ Build optimization complete!"
echo ""
echo "Next steps:"
echo "  1. Run: pnpm run build:production"
echo "  2. Deploy: pnpm run deploy:production"
echo ""
