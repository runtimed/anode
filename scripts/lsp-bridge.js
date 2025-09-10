#!/usr/bin/env node

import { WebSocketServer } from "ws";
import { spawn } from "child_process";
import { createServer } from "http";
import { parse } from "url";

const PORT = 3001;

console.log(`Starting LSP WebSocket bridge on port ${PORT}...`);

// Create HTTP server to handle WebSocket upgrade requests
const server = createServer();

const wss = new WebSocketServer({
  server,
  path: "/pyright", // Handle /pyright path specifically
});

// Handle WebSocket upgrade requests
server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`)
    .pathname;

  if (pathname === "/pyright") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws, request) => {
  console.log("New WebSocket connection established for pyright");

  // Spawn pyright LSP server
  const pyright = spawn("pyright-langserver", ["--stdio"], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  // Forward WebSocket messages to pyright stdin
  ws.on("message", (data) => {
    // Handle both Buffer and ArrayBuffer data
    let messageData;
    if (data instanceof Buffer) {
      messageData = data;
    } else if (data instanceof ArrayBuffer) {
      messageData = Buffer.from(data);
    } else if (typeof data === "string") {
      messageData = Buffer.from(data, "utf8");
    } else {
      console.error("Unknown message type:", typeof data);
      return;
    }

    pyright.stdin.write(messageData);
  });

  // Forward pyright stdout to WebSocket
  pyright.stdout.on("data", (data) => {
    if (ws.readyState === ws.OPEN) {
      // Send as Buffer to maintain binary data integrity
      ws.send(data);
    }
  });

  // Log pyright errors
  pyright.stderr.on("data", (data) => {
    console.error("Pyright error:", data.toString());
  });

  // Handle pyright process exit
  pyright.on("exit", (code) => {
    console.log(`Pyright process exited with code ${code}`);
    if (ws.readyState === ws.OPEN) {
      ws.close();
    }
  });

  // Handle WebSocket close
  ws.on("close", () => {
    console.log("WebSocket connection closed");
    pyright.kill();
  });

  // Handle WebSocket errors
  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    pyright.kill();
  });

  // Handle pyright process errors
  pyright.on("error", (error) => {
    console.error("Failed to start pyright:", error);
    if (ws.readyState === ws.OPEN) {
      ws.close();
    }
  });
});

// Handle HTTP requests (for health checks, etc.)
server.on("request", (req, res) => {
  const parsedUrl = parse(req.url, true);

  if (parsedUrl.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "lsp-bridge" }));
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

server.on("error", (error) => {
  console.error("Server error:", error);
});

server.listen(PORT, () => {
  console.log(`LSP WebSocket bridge running on ws://localhost:${PORT}/pyright`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log("Press Ctrl+C to stop");
});
