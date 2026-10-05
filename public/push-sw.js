/* Web Push for the PWA. Loaded by the generated service worker (workbox importScripts). */

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }
  const data = payload.data || {}
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Flow', {
      body: payload.body || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      data,
      // The same notice never stacks: a newer one replaces it.
      tag: data.insightId || undefined,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const route = (event.notification.data && event.notification.data.route) || 'dashboard'
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = windows.find((client) => 'focus' in client)
    if (open) {
      await open.focus()
      open.postMessage({ type: 'push-open', route })
      return
    }
    await self.clients.openWindow(`/?open=${encodeURIComponent(route)}`)
  })())
})
