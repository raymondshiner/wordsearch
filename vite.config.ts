import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// PWA gated to production builds — a dev service worker defeats HMR (see ~/src/SOLUTIONS.md)
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    ...(command === 'build'
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            manifest: {
              name: 'Word Search Generator',
              short_name: 'WordSearch',
              description: 'Print-ready word search puzzles from your own word list.',
              theme_color: '#1C1E26',
              background_color: '#1C1E26',
              display: 'standalone',
            },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
}))
