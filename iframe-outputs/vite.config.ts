import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "src",
  plugins: [react(), tailwindcss()] as any,
  resolve: {
    alias: {
      "@": resolve(__dirname, "../src"),
    },
  },
  build: {
    outDir: "../worker/dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // TODO: add a basic index.html entry point too!
        react: resolve(__dirname, "src/react.html"),
      },
    },
  },
});
