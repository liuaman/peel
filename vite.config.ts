import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://<user>.github.io/peel/ on GitHub Pages.
export default defineConfig({
  base: '/peel/',
  plugins: [react()],
  optimizeDeps: { exclude: ['@imgly/background-removal', 'onnxruntime-web'] },
})
