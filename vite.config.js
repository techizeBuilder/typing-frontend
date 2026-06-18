import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so built asset URLs (./assets/...) resolve when the desktop
  // app loads index.html from a file:// path. Also works for web hosting.
  base: './',
  // Target Chromium 108 — the engine in Electron 22, the last Electron that runs
  // on Windows 7/8. Ensures the bundled JS uses no syntax newer than that engine.
  build: {
    target: 'chrome108',
  },
  plugins: [react()],
  server: {
    port: 5173,
  }
})
