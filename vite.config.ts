import path from "node:path";
import { fileURLToPath } from "node:url";

import { livestoreDevtoolsPlugin } from "@livestore/devtools-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { visualizer } from "rollup-plugin-visualizer";
import { cloudflare } from "@cloudflare/vite-plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

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
      cloudflare({
        configPath: "./wrangler.toml",
      }),
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
