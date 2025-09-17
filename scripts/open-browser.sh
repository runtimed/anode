export DEV_PORT=${ANODE_DEV_SERVER_PORT:-5173}
export NOTEBOOK_ID=$(openssl rand -hex 8)

URL="http://localhost:$DEV_PORT"

echo "ANODE_OPEN_INCOGNITO: $ANODE_OPEN_INCOGNITO"

echo ""
echo "=============================================="
echo "✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨"
echo ""
echo "🔗 Anode URL: $URL"
echo ""
echo "✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨"
echo "=============================================="
echo ""

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