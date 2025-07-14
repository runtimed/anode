#!/bin/bash

echo "🚀 Starting Anode development environment with PM2..."

# Start all processes defined in ecosystem.config.json
pm2 start ecosystem.config.json

echo "✅ All processes started!"
echo ""
echo "📊 PM2 Status:"
pm2 status
echo ""
echo "📝 To view logs: pm2 logs"
echo "🛑 To stop all: pm2 stop all"
echo "🔄 To restart all: pm2 restart all" 