import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { livestoreDevtoolsPlugin } from '@livestore/devtools-vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  server: {
    port: 5173,
  },
  worker: { format: 'es' },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    livestoreDevtoolsPlugin({ schemaPath: '../schema/src/schema.ts' }),
  ],
})
