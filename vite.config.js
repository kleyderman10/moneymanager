import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    VitePWA({
      // A Capacitor build already ships as a self-contained native bundle: there's no
      // "install as PWA" benefit, and a service worker persists in the WKWebView's storage
      // across app updates, silently serving a stale precached bundle after the native
      // binary is updated. Only the web build should register one.
      disable: mode === 'capacitor',
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'Knexura Finanzas',
        short_name: 'Knexura',
        description: 'Gestión de finanzas personales',
        theme_color: '#0C2630',
        background_color: '#F4F7F7',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/i,
            // Financial and authentication responses must never persist in Cache Storage.
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
}))
