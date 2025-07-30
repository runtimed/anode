#!/bin/bash

[ -f .env ] && source .env

# Extract the port from VITE_IFRAME_OUTPUT_URI (default to 8000 if not set or not found)
IFRAME_URI="${VITE_IFRAME_OUTPUT_URI:-http://localhost:8000}"
IFRAME_PORT=$(echo "$IFRAME_URI" | sed -n 's/.*:\([0-9][0-9]*\).*/\1/p')
IFRAME_PORT=${IFRAME_PORT:-8000}

if [[ "$IFRAME_URI" == http://localhost* || "$IFRAME_URI" == https://localhost* ]]; then
  pnpm exec http-server ./iframe-outputs -p $IFRAME_PORT -c-1
else
  echo "🌐 iframe output available at: $IFRAME_URI"
fi