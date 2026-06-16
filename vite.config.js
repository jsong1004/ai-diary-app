import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: 'AI 감성 일기장',
        short_name: '감성일기',
        description: 'AI가 함께하는 따뜻한 일기장',
        start_url: '/',
        display: 'standalone',
        background_color: '#faf6ee',
        theme_color: '#d96f32',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Firebase / OpenRouter / Open-Meteo API 호출은 캐싱하지 않음 (항상 네트워크)
        runtimeCaching: [
          {
            urlPattern:
              /^https:\/\/(.*\.googleapis\.com|.*\.firebaseio\.com|openrouter\.ai|.*\.open-meteo\.com)\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
