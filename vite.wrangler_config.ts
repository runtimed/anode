import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    mode,
    build: {
      sourcemap: true,
      rollupOptions: {
        input: path.resolve(__dirname, "./backend/entry.ts"),
        external: ["cloudflare:workers"],
      },
    },
    cacheDir: "node_modules/.vite-wrangler",
    server: {
      port: 8787,
      strictPort: true,
    },
    optimizeDeps: {
      exclude: ["cloudflare:workers"],
    },
    plugins: [cloudflare()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
