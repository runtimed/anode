export DEV_PORT=${ANODE_DEV_SERVER_PORT:-5173}
export NOTEBOOK_ID=$(date +%s)-$(openssl rand -hex 4)
export LIVESTORE_SYNC_URL="ws://localhost:$DEV_PORT/livestore"
echo "Starting runtime for notebook: $NOTEBOOK_ID on port: $DEV_PORT"
echo "Sync URL: $LIVESTORE_SYNC_URL"

URL="http://localhost:$DEV_PORT/?notebook=$NOTEBOOK_ID&_t=$(date +%s)"
echo ""
echo "=============================================="
echo "✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨"
echo ""
echo "🔗 Notebook URL: $URL"
echo ""
echo "✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨"
echo "=============================================="
echo ""

if [[ "$OSTYPE" == "darwin"* ]]; then
  (sleep 1 && /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --incognito "$URL" &)
else
  (sleep 1 && open "$URL" &)
fi
RUNT_LOG_LEVEL=debug deno run --allow-all --unstable-broadcast-channel --env-file=.env ../runt/packages/pyodide-runtime-agent/src/mod.ts
