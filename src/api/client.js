import axios from 'axios'
import { Capacitor } from '@capacitor/core'
import { BIOMETRIC_SERVER } from '@/constants/biometric'

const apiBaseURL = import.meta.env.VITE_API_BASE_URL || '/api'

// The refresh token is single-use and rotates on every call, including this silent,
// store-bypassing refresh. If biometric login is enabled, the copy held in the
// Keystore/Keychain must be updated too, or it goes stale the moment a session refresh
// happens through any path other than the biometric login itself — the next Face ID/huella
// attempt then fails as "expired" even though the session is perfectly alive.
const syncBiometricRefreshToken = (refreshToken) => {
  if (!Capacitor.isNativePlatform()) return
  const username = localStorage.getItem('biometricEmail')
  if (!username) return
  import('@capgo/capacitor-native-biometric').then(({ NativeBiometric, AccessControl }) =>
    NativeBiometric.setCredentials({
      username,
      password: refreshToken,
      server: BIOMETRIC_SERVER,
      accessControl: AccessControl.BIOMETRY_ANY,
    })
  ).catch(() => {})
}

const api = axios.create({
  baseURL: apiBaseURL,
  // Without a timeout, a stalled connection (e.g. the API's host waking up from an idle
  // sleep) leaves axios' promise pending forever — no error, no loading state reset, and
  // for Face ID/huella login specifically, no chance to re-sync the just-rotated refresh
  // token into the Keystore/Keychain, so the next attempt is rejected as "expired".
  timeout: 20_000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 402) {
      const subscription = error.response?.data?.subscription
      if (subscription) {
        window.dispatchEvent(new CustomEvent('billing:read-only', { detail: subscription }))
      }
      return Promise.reject(error)
    }
    const isPublicAuthRequest = [
      '/auth/login',
      '/auth/2fa/verify',
      '/auth/verify-email',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/refresh-token',
    ].some((path) => originalRequest.url?.includes(path))
    const hadAccessToken = Boolean(originalRequest.headers?.Authorization)

    if (error.response?.status === 401 && hadAccessToken && !isPublicAuthRequest && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${apiBaseURL}/auth/refresh-token`, { refreshToken }, { timeout: 20_000 })
          localStorage.setItem('accessToken', data.accessToken)
          localStorage.setItem('refreshToken', data.refreshToken)
          await syncBiometricRefreshToken(data.refreshToken)
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
          return api(originalRequest)
        } catch {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          window.location.href = '/login'
        }
      } else {
        localStorage.removeItem('accessToken')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
