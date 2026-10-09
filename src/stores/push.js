import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Capacitor } from '@capacitor/core'
import { pushAPI, assistantAPI } from '@/api'
import { ROUTE_PATHS } from '@/stores/assistant'

// Push notifications: Web Push on the web/PWA, FCM (Android) and APNs (iOS) in the native app.
// The device is registered with the signed-in account and removed on logout, so notices never
// reach someone who is no longer using the app. The on/off choice is remembered per account.
const isNative = Capacitor.isNativePlatform()
const platform = isNative ? Capacitor.getPlatform() : 'web'
const TOKEN_KEY = 'pushToken'

const urlBase64ToUint8Array = (base64) => {
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)))
}

const browserLabel = () => {
  const ua = navigator.userAgent
  const name = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador'
  return name
}

export const usePushStore = defineStore('push', () => {
  const channels = ref({ web: false, android: false, ios: false })
  const vapidPublicKey = ref(null)
  const enabled = ref(false)
  const busy = ref(false)
  // denied | unsupported | failed | null
  const error = ref(null)
  let listenersReady = false
  let resumeWired = false

  const available = computed(() => {
    if (isNative) return true // remote push when configured, local reminders otherwise
    if (!channels.value[platform]) return false
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  })

  // The on/off choice belongs to the account, not to the device.
  let accountId = 'anon'
  const prefKey = () => `pushEnabled:${accountId}`
  const readPref = () => {
    try { return localStorage.getItem(prefKey()) === '1' } catch { return false }
  }
  const writePref = (value) => {
    try { localStorage.setItem(prefKey(), value ? '1' : '0') } catch { /* storage unavailable */ }
  }

  // The router is loaded lazily: it imports stores that import this one.
  const goTo = async (routeName) => {
    const path = ROUTE_PATHS[routeName]
    if (!path) return
    const { default: router } = await import('@/router')
    router.push(path)
  }

  const loadConfig = async () => {
    try {
      const { data } = await pushAPI.config()
      channels.value = data.channels
      vapidPublicKey.value = data.vapidPublicKey
    } catch { /* push is optional */ }
  }

  // --- Native ---
  const registerNative = async () => {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    if (!listenersReady) {
      listenersReady = true
      await PushNotifications.addListener('registration', async ({ value }) => {
        try {
          localStorage.setItem(TOKEN_KEY, value)
          await pushAPI.register({ platform, token: value, label: platform === 'ios' ? 'iPhone' : 'Android' })
        } catch { error.value = 'failed' }
      })
      await PushNotifications.addListener('registrationError', () => { error.value = 'failed' })
      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        goTo(action.notification?.data?.route)
      })
    }
    const permission = await PushNotifications.requestPermissions()
    if (permission.receive !== 'granted') { error.value = 'denied'; return false }
    if (platform === 'android') {
      await PushNotifications.createChannel({ id: 'knexura_notices', name: 'Avisos de Flow', importance: 4, visibility: 1 })
    }
    await PushNotifications.register()
    return true
  }

  // --- Web ---
  const registerWeb = async () => {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') { error.value = 'denied'; return false }
    const registration = await navigator.serviceWorker.ready
    const subscription = (await registration.pushManager.getSubscription())
      || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey.value) })
    await pushAPI.register({ platform: 'web', subscription: subscription.toJSON(), label: browserLabel() })
    return true
  }

  // --- Native, no remote push configured: reminders scheduled on the device ---
  // The same notices the server would push (cards due, budgets, recurring), fetched while the app
  // is open and shown as local notifications. Quiet hours and the daily cap match the server's.
  const LOCAL_SEEN_KEY = 'localNoticesSeen'
  const LOCAL_MAX_PER_DAY = 3
  const QUIET_START = 21
  const QUIET_END = 8
  const useLocal = () => isNative && !channels.value[platform]

  const readSeen = () => {
    try {
      const data = JSON.parse(localStorage.getItem(`${LOCAL_SEEN_KEY}:${accountId}`) || '{}')
      return { day: data.day || '', ids: data.ids || [] }
    } catch { return { day: '', ids: [] } }
  }
  const writeSeen = (seen) => {
    try { localStorage.setItem(`${LOCAL_SEEN_KEY}:${accountId}`, JSON.stringify(seen)) } catch { /* storage unavailable */ }
  }

  // Next moment outside quiet hours (now when it is already allowed).
  const nextAllowedTime = () => {
    const at = new Date(Date.now() + 3000)
    const hour = at.getHours()
    if (hour >= QUIET_START) at.setDate(at.getDate() + 1)
    if (hour >= QUIET_START || hour < QUIET_END) at.setHours(QUIET_END, 5, 0, 0)
    return at
  }

  const registerLocal = async () => {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    if (!listenersReady) {
      listenersReady = true
      await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        goTo(action.notification?.extra?.route)
      })
    }
    const permission = await LocalNotifications.requestPermissions()
    if (permission.display !== 'granted') { error.value = 'denied'; return false }
    if (platform === 'android') {
      await LocalNotifications.createChannel({ id: 'knexura_notices', name: 'Avisos de Flow', importance: 4, visibility: 1 })
    }
    enabled.value = true
    await refreshLocal()
    return true
  }

  const refreshLocal = async () => {
    if (!enabled.value || !useLocal()) return
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const { data } = await assistantAPI.insights()
      const today = new Date().toISOString().slice(0, 10)
      const seen = readSeen()
      if (seen.day !== today) { seen.day = today; seen.countToday = 0 }
      const sentToday = seen.countToday || 0
      const fresh = (data.items || [])
        .filter((item) => ['high', 'medium'].includes(item.severity) && !seen.ids.includes(item.id))
        .slice(0, Math.max(0, LOCAL_MAX_PER_DAY - sentToday))
      if (!fresh.length) return
      const at = nextAllowedTime()
      await LocalNotifications.schedule({
        notifications: fresh.map((item, index) => ({
          id: Math.floor(Date.now() / 1000) % 1000000 + index,
          title: 'Flow',
          body: item.text,
          channelId: 'knexura_notices',
          schedule: { at: new Date(at.getTime() + index * 1000), allowWhileIdle: true },
          extra: { route: item.action?.route || 'dashboard', insightId: item.id },
        })),
      })
      writeSeen({ day: today, countToday: sentToday + fresh.length, ids: [...seen.ids, ...fresh.map((item) => item.id)].slice(-100) })
    } catch { /* notices are optional */ }
  }

  const enable = async () => {
    busy.value = true
    error.value = null
    try {
      if (!available.value) { error.value = 'unsupported'; return false }
      const ok = isNative ? (useLocal() ? await registerLocal() : await registerNative()) : await registerWeb()
      enabled.value = ok
      writePref(ok)
      return ok
    } catch {
      error.value = error.value || 'failed'
      return false
    } finally {
      busy.value = false
    }
  }

  // Removes this device from the account. `remember` keeps the user's choice (used on logout it is
  // false so the next account starts clean).
  const forget = async () => {
    try {
      if (isNative && useLocal()) {
        const { LocalNotifications } = await import('@capacitor/local-notifications')
        const { notifications } = await LocalNotifications.getPending()
        if (notifications.length) await LocalNotifications.cancel({ notifications })
      } else if (isNative) {
        const token = localStorage.getItem(TOKEN_KEY)
        if (token) await pushAPI.unregister({ token })
        localStorage.removeItem(TOKEN_KEY)
      } else if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          await pushAPI.unregister({ endpoint: subscription.endpoint })
          await subscription.unsubscribe()
        }
      }
    } catch { /* the device may already be gone */ }
  }

  const disable = async () => {
    busy.value = true
    await forget()
    enabled.value = false
    writePref(false)
    busy.value = false
  }

  const sendTest = async () => {
    if (!useLocal()) return (await pushAPI.test()).data
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.schedule({
      notifications: [{ id: 1, title: 'Flow', body: 'Las notificaciones funcionan en este dispositivo.', channelId: 'knexura_notices', schedule: { at: new Date(Date.now() + 2000) }, extra: { route: 'dashboard' } }],
    })
    return { sent: 1 }
  }

  // Called once the session is up: refreshes the registration and wires notification taps.
  const init = async (userId) => {
    accountId = userId || 'anon'
    await loadConfig()
    enabled.value = readPref() && available.value
    if (enabled.value) {
      try { if (isNative) await (useLocal() ? registerLocal() : registerNative()); else await registerWeb() } catch { /* silent refresh */ }
    }
    if (isNative && !resumeWired) {
      resumeWired = true
      document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshLocal() })
    }
    if (!isNative && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'push-open') goTo(event.data.route)
      })
      // The notification opened the app from closed: ?open=<route>
      const open = new URLSearchParams(window.location.search).get('open')
      if (open) {
        goTo(open)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }

  const local = computed(() => useLocal())

  return { channels, enabled, busy, error, available, local, platform, init, enable, disable, forget, sendTest }
})
