#!/bin/bash

# Use provided port or default to 5173
DEV_PORT=${ANODE_DEV_SERVER_PORT:-5173}
export ANODE_DEV_SERVER_PORT=$DEV_PORT

# Use runt local
echo "🔄 Using runt local..."
pnpm use-runt local

echo "🚀 Starting Anode development environment with PM2 (single-server setup)..."
echo "📡 Using port: $DEV_PORT"

# Start all processes defined in ecosystem.config.json
pnpm exec pm2 start ecosystem.config.json

echo "✅ All processes started!"
echo ""
echo "📊 PM2 Status:"
pnpm exec pm2 status
echo ""
echo "🌐 Web server: http://localhost:$DEV_PORT (includes backend + frontend)"
echo ""
echo "Make sure to install pm2 globally: pnpm install -g pm2"
echo "📝 To view logs: pm2 logs"
echo "🛑 To stop all: pm2 stop all"
echo "🔄 To restart all: pm2 restart all"
echo "👀 To monitor: pm2 monit"

./scripts/start-nb.sh
