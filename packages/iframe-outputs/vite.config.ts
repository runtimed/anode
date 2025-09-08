import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "src",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "../worker/dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        react: resolve(__dirname, "src/react.html"),
      },
    },
  },
  server: {
    port: 8000,
    strictPort: true,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@anode/shared"],
  },
});
