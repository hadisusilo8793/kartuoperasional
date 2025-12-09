import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cloudflare from "@cloudflare/vite-plugin";
import path from 'path'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cloudflare({
      // By default, the output of `vite build` is placed in `dist`.
      // The plugin will move it to `dist/_worker.js` to be compliant with Cloudflare Pages.
      // It will also automatically generate a `_routes.json` file.
      // See https://github.com/cloudflare/vite-plugin-cloudflare
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    // This is required for Vite to work correctly in the Codesphere environment
    watch: {
      usePolling: true,
    },
  },
})