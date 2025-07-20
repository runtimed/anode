import path from "node:path";
import { fileURLToPath } from "node:url";

import { livestoreDevtoolsPlugin } from "@livestore/devtools-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const plugins = [
    react(),
    tailwindcss(),
    livestoreDevtoolsPlugin({ schemaPath: "./schema.ts" }),
  ];

  // Include Cloudflare plugin in development and auth modes
  if (mode === "development" || mode === "auth") {
    plugins.push(
      cloudflare({
        configPath: "./wrangler.toml",
      })
    );
  }

  return {
    build: {
      sourcemap: true,
    },
    server: {
      port: env.ANODE_DEV_SERVER_PORT
        ? parseInt(env.ANODE_DEV_SERVER_PORT)
        : 5173,
      watch: {
        ignored: ["!**/node_modules/@runt/schema/mod.ts", "**/.env*"],
        followSymlinks: true,
      },
    },
    worker: { format: "es" },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      exclude: ["@livestore/wa-sqlite"],
      include: [
        "react",
        "react-dom",
        "effect",
        "@livestore/livestore",
        "@livestore/react",
      ],
      esbuildOptions: {
        target: "esnext",
      },
    },
    plugins,
  };
});
