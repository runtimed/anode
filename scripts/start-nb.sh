# Source the .env file to get VITE_RUNTIME_COMMAND
if [ -f ".env" ]; then
  echo "Sourcing .env file"
  source .env
fi

export DEV_PORT=${ANODE_DEV_SERVER_PORT:-5173}
export NOTEBOOK_ID=$(date +%s)-$(openssl rand -hex 4)

URL="http://localhost:$DEV_PORT/?notebook=$NOTEBOOK_ID"

echo "ANODE_OPEN_INCOGNITO: $ANODE_OPEN_INCOGNITO"

RUNTIME_CMD="NOTEBOOK_ID=${NOTEBOOK_ID} ${VITE_RUNTIME_COMMAND}"
echo "Starting runtime in background..."
echo ""
echo "$RUNTIME_CMD"
echo ""

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
pnpm exec pm2 start --name "nb-$NOTEBOOK_ID" "$RUNTIME_CMD"

sleep 3

# Open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
  if [[ "$ANODE_OPEN_INCOGNITO" == "1" ]]; then
    echo "Opening in incognito mode"
    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --incognito "$URL"
  else
    echo "Opening in normal mode"
    open "$URL"
  fi
else
  echo "Opening in normal mode"
  open "$URL"
fi