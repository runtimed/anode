# Source the .env file to get VITE_RUNTIME_COMMAND
if [ -f ".env" ]; then
  echo "Sourcing .env file"
  source .env
fi

# 🚨 IMPORTANT: We're overriding the runtime command here to avoid it breaking by accident
export VITE_RUNTIME_COMMAND="deno run --allow-all --unstable-broadcast-channel --env-file=../anode/.env ../runt/packages/pyodide-runtime-agent/src/mod.ts"
export DEV_PORT=${ANODE_DEV_SERVER_PORT:-5173}


# If NOTEBOOK_ID is not set, generate a random one
if [ -z "$NOTEBOOK_ID" ]; then
  export NOTEBOOK_ID=$(date +%s)-$(openssl rand -hex 4)
fi

URL="http://localhost:$DEV_PORT/?notebook=$NOTEBOOK_ID"

echo "ANODE_OPEN_INCOGNITO: $ANODE_OPEN_INCOGNITO"

RUNTIME_CMD="NOTEBOOK_ID=${NOTEBOOK_ID} ${VITE_RUNTIME_COMMAND}"

echo ""
echo "=============================================="
echo "✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨"
echo ""
echo "🔗 Notebook URL: $URL"
echo ""
echo "🐇 Runtime command (started in background):"
echo ""
echo "$RUNTIME_CMD"
echo ""
echo "✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨"
echo "=============================================="
echo ""

# Start runtime in background
pnpm exec pm2 start --name "notebook=$NOTEBOOK_ID" "$RUNTIME_CMD"

sleep 1

# Open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
  if [[ "$ANODE_OPEN_INCOGNITO" == "1" ]]; then
    echo "Opening in incognito mode"
    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --incognito "$URL" >/dev/null 2>&1 &
  else
    echo "Opening in normal mode"
    open "$URL" &
  fi
else
  echo "Opening in normal mode"
  open "$URL" &
fi