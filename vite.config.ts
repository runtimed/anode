import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "child_process";

import { livestoreDevtoolsPlugin } from "@livestore/devtools-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { injectLoadingScreen } from "./vite-plugins/inject-loading-screen.js";
import { envValidationPlugin } from "./vite-plugins/env-validation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Get git commit hash - check various CI environments
  let gitCommitHash =
    process.env.VITE_GIT_COMMIT_HASH || // Explicitly set
    process.env.WORKERS_CI_COMMIT_SHA || // Cloudflare
    process.env.GITHUB_SHA?.substring(0, 7); // GitHub Actions (short SHA)

  if (!gitCommitHash) {
    try {
      // Get the commit hash
      gitCommitHash = execSync("git rev-parse --short HEAD", {
        encoding: "utf8",
      }).trim();

      // Check if the working directory is dirty
      const isDirty =
        execSync("git status --porcelain", {
          encoding: "utf8",
        }).trim().length > 0;

      if (isDirty) {
        gitCommitHash += "-dirty";
      }
    } catch (e) {
      // Fallback when git info is not available (e.g., in CI or non-git directory)
      console.error("git command error:", e);
      gitCommitHash = "unknown";
    }
  }

  const plugins = [
    envValidationPlugin(env),
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
    mode,
    build: {
      sourcemap: true,
    },
    server: {
      port: env.ANODE_DEV_SERVER_PORT
        ? parseInt(env.ANODE_DEV_SERVER_PORT)
        : 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: "http://localhost:8787",
          changeOrigin: true,
        },
      },
    },
    cacheDir: "node_modules/.vite-main",
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
    define: {
      "import.meta.env.VITE_GIT_COMMIT_HASH": JSON.stringify(gitCommitHash),
    },
  };
});
