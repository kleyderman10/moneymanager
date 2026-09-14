import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { Capacitor } from '@capacitor/core'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import './styles/finance.css'

import App from './App.vue'
import router from './router'

if (Capacitor.isNativePlatform()) {
  // The Capacitor build no longer registers a service worker (see vite.config.js), but the
  // WKWebView/WebView's storage persists across app updates, so an install made before this
  // change can still have an old one active — silently serving a stale precached JS bundle
  // (e.g. the pre-fix build that called the API with a relative /api path) even after the
  // native app itself has been updated. Actively tear it down so the bundle shipped in the
  // current native build is always what actually runs.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
      .catch(() => {})
  }
  if ('caches' in window) {
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => {})
  }
} else {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      onNeedRefresh() {
        if (confirm('Nueva versión disponible. ¿Actualizar?')) {
          window.location.reload()
        }
      },
      onOfflineReady() {
        console.log('App lista para uso offline')
      },
    })
  })

  // Remove API responses cached by versions prior to the security hardening release.
  if ('caches' in window) {
    caches.delete('api-cache').catch(() => {})
  }
}

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          background: '#F4F7F7',
          surface: '#FFFFFF',
          primary: '#0B6B5D',
          secondary: '#153B47',
          accent: '#D5A94E',
          error: '#D94B5B',
          info: '#3276B1',
          success: '#159A72',
          warning: '#E2A12A',
          income: '#159A72',
          expense: '#D94B5B',
        },
        variables: {
          'border-color': '#DCE6E5',
          'border-opacity': 1,
          'high-emphasis-opacity': 0.92,
          'medium-emphasis-opacity': 0.68,
        },
      },
      dark: {
        dark: true,
        colors: {
          background: '#07151B',
          surface: '#10242B',
          primary: '#56D8BB',
          secondary: '#A7C8CF',
          accent: '#EAC875',
          income: '#45C99B',
          expense: '#FF7C88',
        },
      },
    },
  },
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(vuetify)
app.mount('#app')
