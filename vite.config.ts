import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'favicon.svg', 'apple-touch-icon.png', 'icon-192.svg', 'icon-512.svg'],
      manifest: {
        id: '/',
        name: 'Velor — Таймеры для мастера',
        short_name: 'Velor',
        description: 'Таймеры зон для бровей и ресниц',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon.svg',
            sizes: '1024x1024',
            type: 'image/svg+xml',
          },
          {
            src: '/icon.svg',
            sizes: '1024x1024',
            type: 'image/svg+xml',
          },
          {
            src: '/icon.svg',
            sizes: '1024x1024',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
