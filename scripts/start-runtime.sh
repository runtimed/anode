export DEV_PORT=5173

# If NOTEBOOK_ID is not set, generate a random one
if [ -z "$NOTEBOOK_ID" ]; then
  export NOTEBOOK_ID=$(date +%s)-$(openssl rand -hex 4)
fi

echo "Starting runtime for notebook: $NOTEBOOK_ID on port: $DEV_PORT"

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