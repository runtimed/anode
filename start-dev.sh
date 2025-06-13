#!/bin/bash

# Anode Development Start Script
# Simplified architecture: NOTEBOOK_ID = STORE_ID

set -e

echo "🚀 Starting Anode development environment..."
echo ""
echo "📋 Architecture Overview:"
echo "  • Each notebook = one LiveStore database"
echo "  • Access via URL: ?notebook=notebook-id"
echo "  • Kernels connect to specific notebook stores"
echo ""

# Check if we need to reset storage
if [[ "$1" == "--reset" ]]; then
  echo "🧹 Resetting local storage..."
  pnpm reset-storage
  echo ""
fi

# Build schema first (required)
echo "🔧 Building schema package..."
pnpm build:schema

echo ""
echo "🌐 Starting core services..."
echo ""
echo "Available services:"
echo "  • Web Client: http://localhost:5173"
echo "  • Sync Server: ws://localhost:8787"
echo "  • Create notebook: Add ?notebook=my-notebook-id to URL"
echo ""
echo "📝 To start a kernel for a specific notebook:"
echo "  NOTEBOOK_ID=my-notebook-id pnpm dev:kernel"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start core services (web client + sync server)
exec pnpm dev
