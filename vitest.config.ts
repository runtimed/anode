import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Use happy-dom for DOM testing (lighter than jsdom)
    environment: "happy-dom",

    // Test file patterns
    include: [
      "packages/*/src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "packages/*/test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],

    // Exclude patterns
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
    ],

    // Global test settings
    globals: true,

    // Test timeout
    testTimeout: 10000,

    // Setup files
    setupFiles: ["./test/setup.ts"],

    // Coverage settings
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./test-results/coverage",
      exclude: [
        "node_modules/",
        "test/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/dist/**",
      ],
    },

    // Workspace support for monorepo
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },

    // Environment variables
    env: {
      NODE_ENV: "test",
    },

    // Reporter configuration
    reporters: ["verbose"],

    // Retry failed tests
    retry: 2,

    // TypeScript configuration for tests
    typecheck: {
      enabled: false, // Let TypeScript handle this separately
    },
  },

  // Resolve aliases for imports - pointing directly to source files
  resolve: {
    alias: {
      "@anode/web-client": path.resolve(__dirname, "./packages/web-client/src"),
      "@anode/docworker": path.resolve(__dirname, "./packages/docworker/src"),
      "@anode/dev-server-kernel-ls-client": path.resolve(
        __dirname,
        "./packages/dev-server-kernel-ls-client/src",
      ),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
});
