import { createServer } from "node:http";
import { URL } from "node:url";

// Import the REACTIVE kernel adapter logic that handles LiveStore events
import "./mod-reactive.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const NOTEBOOK_ID = process.env.NOTEBOOK_ID || "demo-notebook";

// Create HTTP server ONLY for health checks and status - NO execution endpoints
const server = createServer(async (req, res) => {
  // Add CORS headers for web client access
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  // Health check endpoint
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        notebook: NOTEBOOK_ID,
        timestamp: new Date().toISOString(),
        service: "dev-server-kernel-ls-client",
        execution_model: "livestore-events-only",
        ai_support: "enabled (mock responses)",
      }),
    );
    return;
  }

  // Status endpoint with LiveStore connection details
  if (url.pathname === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        service: "dev-server-kernel-ls-client",
        notebook: NOTEBOOK_ID,
        port: PORT,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        execution_model: "livestore-events-only",
        ai_support: "enabled (mock responses)",
        note: "This service responds ONLY to LiveStore cellExecutionRequested events for code and AI cells",
        env: {
          NODE_VERSION: process.version,
          LIVESTORE_SYNC_URL:
            process.env.LIVESTORE_SYNC_URL || "ws://localhost:8787",
          AUTH_TOKEN: process.env.AUTH_TOKEN ? "[REDACTED]" : "[NOT SET]",
        },
      }),
    );
    return;
  }

  // Default 404 with helpful information
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      error: "Not found",
      available_endpoints: ["/health", "/status"],
      execution_model: "livestore-events-only",
      ai_support: "enabled (mock responses)",
      note: "This kernel service does NOT provide HTTP execution endpoints",
    }),
  );
});

// Start the HTTP server (just for health checks)
server.listen(PORT, () => {
  console.log(`🐍 Kernel Service running on port ${PORT}`);
  console.log(`📓 Serving notebook: ${NOTEBOOK_ID}`);
  console.log(`🔗 LiveStore REACTIVE adapter starting (event-driven execution only)...`);
  console.log(`💡 Available endpoints:`);
  console.log(`   • GET  http://localhost:${PORT}/health`);
  console.log(`   • GET  http://localhost:${PORT}/status`);
  console.log(``);
  console.log(`⚡ Code & AI execution happens via REACTIVE LiveStore queries:`);
  console.log(`   1. Web client emits cellExecutionRequested event (code or AI)`);
  console.log(`   2. This service reacts to queue changes via queryDb subscriptions`);
  console.log(`   3. Python code executes with Pyodide OR AI generates mock response`);
  console.log(`   4. Results sent back via cellOutputAdded events`);
  console.log(`   5. All connected clients see results in real-time`);
});

// Graceful shutdown
let isShuttingDown = false;

const shutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("🛑 Shutting down kernel service...");
  console.log("🔗 LiveStore REACTIVE adapter will handle its own cleanup...");

  server.close(() => {
    console.log("✅ HTTP server closed");
    console.log("🎉 Kernel service shutdown complete");
    process.exit(0);
  });

  // Force exit after 5 seconds
  setTimeout(() => {
    console.log("⚠️ Force exit after timeout");
    process.exit(1);
  }, 5000);
};

// Handle shutdown signals
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught exception:", error);
  shutdown();
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled rejection at:", promise, "reason:", reason);
  shutdown();
});

console.log("🎉 Kernel service operational - LiveStore REACTIVE mode");
console.log("📡 Listening for reactive queue changes...");
console.log("🔌 Press Ctrl+C to stop");
