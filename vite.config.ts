import path from "node:path";
import { fileURLToPath } from "node:url";

import { livestoreDevtoolsPlugin } from "@livestore/devtools-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { injectLoadingScreen } from "./vite-plugins/inject-loading-screen.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const plugins = [
    injectLoadingScreen(),
    react({
      babel: {
        plugins: [
          [
            "babel-plugin-react-compiler",
            {
              // Enable React Compiler
              enable: true,
              // Optional: Configure which files to compile
              include: ["src/**/*.{js,jsx,ts,tsx}"],
              // Optional: Exclude certain files
              exclude: [
                "src/**/*.test.{js,jsx,ts,tsx}",
                "src/**/*.spec.{js,jsx,ts,tsx}",
              ],
            },
          ],
        ],
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
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Split markdown-related dependencies into their own chunk
            if (
              id.includes("react-markdown") ||
              id.includes("remark-gfm") ||
              id.includes("react-syntax-highlighter") ||
              id.includes("prism") ||
              id.includes("refractor") ||
              id.includes("hastscript") ||
              id.includes("hast-") ||
              id.includes("mdast-") ||
              id.includes("micromark") ||
              id.includes("unist-")
            ) {
              return "markdown";
            }

            // Split react-spring into its own chunk for faster loading
            if (id.includes("@react-spring")) {
              return "react-spring";
            }

            // Split UI libraries
            if (
              id.includes("@radix-ui") ||
              id.includes("@floating-ui") ||
              id.includes("cmdk")
            ) {
              return "ui-libs";
            }

            // Split codemirror into its own chunk
            if (id.includes("@codemirror") || id.includes("@lezer")) {
              return "codemirror";
            }

            // Split Effect and schema libraries
            if (
              id.includes("effect") ||
              id.includes("@runt/schema") ||
              id.includes("@effect")
            ) {
              return "effect-schema";
            }

            // Split LiveStore and SQLite
            if (
              id.includes("@livestore") ||
              id.includes("wa-sqlite") ||
              id.includes("sql.js")
            ) {
              return "livestore";
            }

            // Split auth related libraries
            if (
              id.includes("oidc-client") ||
              id.includes("jose") ||
              id.includes("@auth")
            ) {
              return "auth";
            }

            // Split React ecosystem (but not react/react-dom themselves)
            if (
              id.includes("react-router") ||
              id.includes("react-use") ||
              id.includes("react-error-boundary")
            ) {
              return "react-ecosystem";
            }

            // Keep node_modules in vendor chunk (except those already handled)
            if (id.includes("node_modules")) {
              return "vendor";
            }
          },
        },
      },
    },
    server: {
      port: env.ANODE_DEV_SERVER_PORT
        ? parseInt(env.ANODE_DEV_SERVER_PORT)
        : 5173,
      watch: {
        ignored: ["!**/node_modules/@runt/schema/mod.ts", "**/.env*"],
        followSymlinks: true,
      },
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
