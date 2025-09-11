#!/usr/bin/env node

import { parse } from "url";
import * as ws from "ws";
import * as http from "http";
import * as rpc from "@sourcegraph/vscode-ws-jsonrpc";
import * as rpcServer from "@sourcegraph/vscode-ws-jsonrpc/lib/server";

const PORT = 3001;

console.log(`Starting LSP WebSocket bridge on port ${PORT}...`);

// Create HTTP server to handle WebSocket upgrade requests
const server = http.createServer();

function toSocket(webSocket: ws.WebSocket): rpc.IWebSocket {
  return {
    send: (content) => webSocket.send(content),
    onMessage: (cb) => (webSocket.onmessage = (event) => cb(event.data)),
    onError: (cb) =>
      (webSocket.onerror = (event) => {
        if ("message" in event) {
          cb((event as any).message);
        }
      }),
    onClose: (cb) =>
      (webSocket.onclose = (event) => cb(event.code, event.reason)),
    dispose: () => webSocket.close(),
  };
}

const wss = new ws.WebSocketServer({
  perMessageDeflate: false,
  server,
  path: "/pyright", // Handle /pyright path specifically
});

wss.on("connection", (client, request: http.IncomingMessage) => {
  console.log("🪴 🪴 🪴 New WebSocket connection established for pyright");

  console.log("Request headers:", request.headers);
  console.log("Request method:", request.method);
  console.log("Request url:", request.url);

  // Try to read the request body (if any)
  // let body: any[] = [];
  // request.on("data", (chunk) => {
  //   body.push(chunk);
  // });
  // request.on("end", () => {
  //   if (body.length > 0) {
  //     const rawBody = Buffer.concat(body).toString();
  //     console.log("Request body:", rawBody);
  //   } else {
  //     console.log("Request body: <empty>");
  //   }
  // });

  const localConnection = rpcServer.createServerProcess(
    "Python Language Server",
    "basedpyright-langserver",
    ["--stdio"]
  );

  const socket: rpc.IWebSocket = toSocket(client);
  const connection = rpcServer.createWebSocketConnection(socket);
  rpcServer.forward(connection, localConnection);

  console.log(`Forwarding new client`);

  client.send(
    JSON.stringify({
      jsonrpc: "2.0",
      method: "hello!!!",
    })
  );

  client.on("message", (data) => {
    console.log(
      "Received message from WebSocket:",
      JSON.stringify(JSON.parse(data.toString()), null, 2)
    );
  });

  socket.onClose((code, reason) => {
    console.log("Client closed", reason);
    localConnection.dispose();
  });
});

// wss.on("connection", (ws, request: http.IncomingMessage) => {
//   console.log("New WebSocket connection established for pyright");

//   // Spawn pyright LSP server
//   const pyright = spawn("pyright-langserver", ["--stdio"], {
//     stdio: ["pipe", "pipe", "pipe"],
//   });

//   // Forward WebSocket messages to pyright stdin
//   ws.on("message", (data) => {
//     console.log(
//       "Received message from WebSocket:",
//       JSON.stringify(data, null, 2)
//     );
//     // Handle both Buffer and ArrayBuffer data
//     let messageData;
//     if (data instanceof Buffer || data instanceof Uint8Array) {
//       messageData = data;
//     } else if (data instanceof ArrayBuffer) {
//       messageData = Buffer.from(data);
//     } else if (typeof data === "string") {
//       messageData = Buffer.from(data, "utf8");
//     } else {
//       console.error("Unknown message type:", typeof data);
//       return;
//     }

//     console.log(
//       "Sending message to pyright:",
//       JSON.stringify(messageData, null, 2)
//     );
//     pyright.stdin.write(messageData);
//   });

//   // Forward pyright stdout to WebSocket
//   pyright.stdout.on("data", (data) => {
//     if (ws.readyState === ws.OPEN) {
//       // if (data.toString().includes("Content-Length")) {
//       //   return;
//       // }
//       console.log("Sending message to WebSocket:", data.toString());
//       // Send as text - the LSP client expects text messages
//       ws.send(data.toString());
//     }
//   });

//   // Log pyright errors
//   pyright.stderr.on("data", (data) => {
//     console.error("Pyright error:", data.toString());
//   });

//   // Handle pyright process exit
//   pyright.on("exit", (code) => {
//     console.log(`Pyright process exited with code ${code}`);
//     if (ws.readyState === ws.OPEN) {
//       ws.close();
//     }
//   });

//   // Handle WebSocket close
//   ws.on("close", () => {
//     console.log("WebSocket connection closed");
//     pyright.kill();
//   });

//   // Handle WebSocket errors
//   ws.on("error", (error) => {
//     console.error("WebSocket error:", error);
//     pyright.kill();
//   });

//   // Handle pyright process errors
//   pyright.on("error", (error) => {
//     console.error("Failed to start pyright:", error);
//     if (ws.readyState === ws.OPEN) {
//       ws.close();
//     }
//   });
// });

// Handle HTTP requests (for health checks, etc.)
server.on("request", (req, res) => {
  const parsedUrl = parse(req.url ?? "", true);

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
