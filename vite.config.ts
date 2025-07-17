import path from "node:path";
import { fileURLToPath } from "node:url";

import { livestoreDevtoolsPlugin } from "@livestore/devtools-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Extract domain/port from WebSocket URL and build HTTP URL
  const livestoreUrl = env.LIVESTORE_SYNC_URL || "ws://localhost:8787";
  const urlParts = new URL(livestoreUrl);
  const isSecure = urlParts.protocol === "wss:";
  const syncUrl = `${isSecure ? "https" : "http"}://${urlParts.host}`;

  return {
    build: {
      sourcemap: true,
    },
    server: {
      port: env.ANODE_DEV_SERVER_PORT
        ? parseInt(env.ANODE_DEV_SERVER_PORT)
        : 5173,
      watch: {
        ignored: ["!**/node_modules/@runt/schema/mod.ts"],
        followSymlinks: true,
      },
      // Proxy API requests to the backend using LIVESTORE_SYNC_URL
      proxy: {
        "/api": {
          target: syncUrl,
          changeOrigin: true,
          secure: false,
        },
        "/livestore": {
          target: syncUrl,
          changeOrigin: true,
          secure: false,
          ws: true, // Enable WebSocket proxying
        },
        "/health": {
          target: syncUrl,
          changeOrigin: true,
          secure: false,
        },
        "/debug": {
          target: syncUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    worker: { format: "es" },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      livestoreDevtoolsPlugin({ schemaPath: "./schema.ts" }),
      visualizer({
        filename: "dist/bundle-analysis.html",
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    ],
  };
});
