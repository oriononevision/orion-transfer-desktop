import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** Même UI que Transfer web — zéro duplication. */
const transferRoot = path.resolve(__dirname, '../orion-transfer')

export default defineConfig({
  root: transferRoot,
  base: './',
  envDir: path.resolve(__dirname),
  publicDir: path.join(transferRoot, 'public'),
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5176,
    strictPort: true,
    fs: {
      allow: [transferRoot, path.resolve(__dirname)],
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
})
