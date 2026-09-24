// Identity of this phone/browser for the API: a random id generated once, plus the
// "trusted device" token the server hands out after an email code is verified here, which
// lets later password logins skip the two-step verification code on this device.
const DEVICE_ID_KEY = 'deviceId'
const TRUST_TOKEN_KEY = 'trustedDeviceToken'

const randomUUID = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export const getDeviceId = () => {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export const getTrustToken = () => localStorage.getItem(TRUST_TOKEN_KEY) || undefined

export const setTrustToken = (token) => {
  if (token) localStorage.setItem(TRUST_TOKEN_KEY, token)
}

export const clearTrustToken = () => localStorage.removeItem(TRUST_TOKEN_KEY)
