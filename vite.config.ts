import path from "node:path";
import { fileURLToPath } from "node:url";

import { livestoreDevtoolsPlugin } from "@livestore/devtools-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { injectLoadingScreen } from "./vite-plugins/inject-loading-screen.js";
import { iframeServerPlugin } from "./vite-plugins/iframe-server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const plugins = [
    // injectLoadingScreen(),
    iframeServerPlugin(),
    react({
      babel: {
        // 🚨 IMPORTANT:Add `"use no memo"` to opt out of React Compiler
        // https://react.dev/reference/react-compiler/compilationMode#opting-out
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
    livestoreDevtoolsPlugin({ schemaPath: "./schema.ts" }),
  ];

  // Include Cloudflare plugin in development and auth modes
  if (mode === "development" || mode === "auth") {
    // TODO: This isn't working with SPA
    // Even with the symlink, this 307 redirects /oidc?code to /oidc/code
    // which breaks the auth flow.
    // plugins.push(
    //   cloudflare({
    //     configPath: "./wrangler.toml",
    //   })
    // );
  }

  return {
    build: {
      sourcemap: true,
    },
    server: {
      port: env.ANODE_DEV_SERVER_PORT
        ? parseInt(env.ANODE_DEV_SERVER_PORT)
        : 5173,
      strictPort: true,
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
        "@react-spring/web",
      ],
      esbuildOptions: {
        target: "esnext",
      },
    },
    plugins,
  };
});
