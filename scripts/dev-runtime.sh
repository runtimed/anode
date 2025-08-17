#!/bin/bash

# Smart runtime script that detects the dev server port and sets the correct sync URL

# Default port
DEV_PORT=${ANODE_DEV_SERVER_PORT:-5173}

# Check if dev server is running on the default port
if ! curl -s http://localhost:$DEV_PORT/health >/dev/null 2>&1; then
    # Try to find the dev server on common ports
    for port in 5174 5175 5176 5177 5178; do
        if curl -s http://localhost:$port/health >/dev/null 2>&1; then
            DEV_PORT=$port
            echo "📡 Found dev server on port $port"
            break
        fi
    done
fi

# Set the sync URL for this port
export LIVESTORE_SYNC_URL="ws://localhost:$DEV_PORT/livestore"

echo "🔗 Connecting to LiveStore at: $LIVESTORE_SYNC_URL"

# Run the runtime agent
deno run --allow-all --env-file=.env "jsr:@runt/pyodide-runtime-agent@^0.9.0" "$@"
