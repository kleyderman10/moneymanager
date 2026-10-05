import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// Every browser and WebView this app targets (Chrome/Android WebView, Safari/WKWebView) reads
// woff2, so shipping the .eot/.ttf/.woff copies of the icon font only adds ~3 MB to the build.
const mdiWoff2Only = () => ({
  name: 'mdi-woff2-only',
  enforce: 'pre',
  transform(code, id) {
    if (!id.endsWith('materialdesignicons.css')) return null
    return code.replace(
      /src: url\("\.\.\/fonts\/materialdesignicons-webfont\.eot[^;]*;\s*src:[^;]*;/,
      'src: url("../fonts/materialdesignicons-webfont.woff2?v=7.4.47") format("woff2");'
    )
  },
})

export default defineConfig(({ mode }) => ({
  plugins: [
    mdiWoff2Only(),
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
        name: 'Knexura Flow',
        short_name: 'Knexura Flow',
        description: 'Gestión de finanzas personales',
        theme_color: '#071D29',
        background_color: '#071D29',
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
        globPatterns: ['**/*.{js,css,html,ico,png,webp,svg,woff,woff2,ttf,eot}'],
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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/vue-chartjs')) return 'charts'
          if (id.includes('node_modules/vuetify')) return 'vuetify'
          if (id.includes('node_modules/vue-i18n') || id.includes('node_modules/@intlify')) return 'i18n'
        },
      },
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
