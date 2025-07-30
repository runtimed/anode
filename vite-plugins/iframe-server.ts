import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { existsSync } from "node:fs";
import type { Plugin, ViteDevServer } from "vite";

const mimeTypes: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

export function iframeServerPlugin(): Plugin {
  let server: ReturnType<typeof createServer> | null = null;

  return {
    name: "iframe-server",
    apply: "serve", // Only run in dev mode

    configureServer(viteServer: ViteDevServer) {
      // Parse port from VITE_IFRAME_OUTPUT_URI
      const iframeUri = process.env.VITE_IFRAME_OUTPUT_URI || "http://localhost:8000";
      const portMatch = iframeUri.match(/:(\d+)/);
      const port = portMatch ? parseInt(portMatch[1], 10) : 8000;

      // Only start if it's a localhost URI
      if (!iframeUri.startsWith("http://localhost") && !iframeUri.startsWith("https://localhost")) {
        viteServer.config.logger.info(`🌐 iframe output available at: ${iframeUri}`);
        return;
      }

      const iframeOutputsDir = join(process.cwd(), "iframe-outputs");

      // Create HTTP server
      server = createServer(async (req, res) => {
        try {
          // Default to index.html for root path
          let filePath = req.url === "/" ? "/index.html" : req.url || "";

          // Remove query string
          filePath = filePath.split("?")[0];

          // Security: prevent directory traversal
          if (filePath.includes("..")) {
            res.writeHead(403);
            res.end("Forbidden");
            return;
          }

          const fullPath = join(iframeOutputsDir, filePath);

          // Check if file exists
          if (!existsSync(fullPath)) {
            res.writeHead(404);
            res.end("Not Found");
            return;
          }

          // Read and serve file
          const content = await readFile(fullPath);
          const ext = extname(fullPath);
          const mimeType = mimeTypes[ext] || "application/octet-stream";

          // Set headers (including cache control similar to http-server -c-1)
          res.writeHead(200, {
            "Content-Type": mimeType,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Access-Control-Allow-Origin": "*", // Allow CORS for iframe usage
          });

          res.end(content);
        } catch (error) {
          console.error("Error serving iframe file:", error);
          res.writeHead(500);
          res.end("Internal Server Error");
        }
      });

      // Start the server
      server.listen(port, () => {
        viteServer.config.logger.info(`  ➜  Iframe server: http://localhost:${port}`);
      });

      // Handle graceful shutdown
      process.on("SIGTERM", () => {
        if (server) {
          server.close();
        }
      });
    },

    closeBundle() {
      // Clean up server when Vite closes
      if (server) {
        server.close();
        server = null;
      }
    },
  };
}
