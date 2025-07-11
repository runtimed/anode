export DEV_PORT=5173
export NOTEBOOK_ID=$(date +%s)-$(openssl rand -hex 4)
echo "Starting runtime for notebook: $NOTEBOOK_ID on port: $DEV_PORT"

# Wait a moment for tabs to close, then open new tab
(sleep 3 && open "http://localhost:$DEV_PORT/?notebook=$NOTEBOOK_ID&_t=$(date +%s)" &)
RUNT_LOG_LEVEL=debug deno run --allow-all --unstable-broadcast-channel --env-file=.env ../runt/packages/pyodide-runtime-agent/src/mod.ts