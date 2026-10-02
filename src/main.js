import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { Capacitor } from '@capacitor/core'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import '@fontsource-variable/inter'
import 'driver.js/dist/driver.css'
import './styles/finance.css'
import './styles/design-tokens.css'
import './styles/tour.css'
import './styles/flow.css'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { snapshotStatePlugin } from './stores/resetStores'

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
        if (confirm(i18n.global.t('app.newVersionAvailable'))) {
          window.location.reload()
        }
      },
      onOfflineReady() {
        console.log('App ready for offline use')
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
  display: { mobileBreakpoint: 'md' },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'dark',
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
      // Knexura Flow. Keep in sync with src/styles/design-tokens.css.
      dark: {
        dark: true,
        colors: {
          background: '#081F2B',
          surface: '#0F3B47',
          'surface-bright': '#123F4D',
          'surface-variant': '#123F4D',
          primary: '#00E5D0',
          'primary-darken-1': '#22D3C5',
          secondary: '#3FB6FF',
          accent: '#D4A574',
          income: '#28D9A5',
          expense: '#FF626D',
          'on-background': '#F5FAFC',
          'on-surface': '#F5FAFC',
          'on-surface-variant': '#9FB8C3',
          'on-primary': '#04222B',
          'on-secondary': '#04222B',
          'on-success': '#04222B',
          'on-warning': '#04222B',
          error: '#FF626D',
          info: '#3FB6FF',
          success: '#28D9A5',
          warning: '#F4B860',
        },
        variables: {
          'border-color': '#64E6DC',
          'border-opacity': 0.18,
          'high-emphasis-opacity': 0.96,
          'medium-emphasis-opacity': 0.72,
        },
      },
    },
  },
})

const app = createApp(App)
const pinia = createPinia()
pinia.use(snapshotStatePlugin)
app.use(pinia)
app.use(router)
app.use(vuetify)
app.use(i18n)
app.mount('#app')
