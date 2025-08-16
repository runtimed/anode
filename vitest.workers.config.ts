import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    // Only run selective-entry integration tests with Workers pool
    include: ["test/selective-entry*.test.ts"],

    // Global test settings
    globals: true,
    testTimeout: 30000, // Longer timeout for integration tests

    // Setup files
    setupFiles: ["./test/setup.ts"],

    // Pool configuration for Workers testing
    poolOptions: {
      workers: {
        // Use our wrangler configuration
        wrangler: {
          configPath: "./wrangler.toml",
        },
        // Simplified miniflare configuration
        miniflare: {
          compatibilityDate: "2025-05-08",
          compatibilityFlags: ["nodejs_compat"],
          // Load our selective-entry worker for testing
          main: "./backend/selective-entry.ts",
          // Basic bindings for testing
          bindings: {
            DEPLOYMENT_ENV: "test",
            ALLOW_LOCAL_AUTH: "true",
            AUTH_ISSUER: "http://localhost:8787/local_oidc",
            SERVICE_PROVIDER: "local",
            ARTIFACT_STORAGE: "r2",
            ARTIFACT_THRESHOLD: "16384",
          },
        },
      },
    },

    // Reporter configuration
    reporters: ["verbose"],

    // Retry failed tests
    retry: 1,
  },
});
