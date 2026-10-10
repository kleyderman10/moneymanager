import axios from 'axios'
import { i18n } from '@/i18n'
import { useSnackbar } from '@/stores/snackbar'

const apiBaseURL = import.meta.env.VITE_API_BASE_URL || '/api'

// Single-flight refresh: the refresh token is single-use, so when several requests hit a
// 401 at once they must share one refresh call. Otherwise the second call presents a
// token the first one already rotated, fails, and logs the user out.
let refreshPromise = null

const refreshSession = () => {
  if (!refreshPromise) {
    const refreshToken = localStorage.getItem('refreshToken')
    refreshPromise = axios.post(`${apiBaseURL}/auth/refresh-token`, { refreshToken }, { timeout: 20_000 })
      .then(({ data }) => {
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        return data.accessToken
      })
      .finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

// The router is loaded lazily: it imports stores that import this client.
const endSession = async () => {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  try {
    const { default: router } = await import('@/router')
    const current = router.currentRoute.value
    if (current.name === 'Login') return
    useSnackbar().info(i18n.global.t('common.sessionExpired'))
    await router.push({ name: 'Login', query: { redirect: current.fullPath } })
  } catch {
    window.location.href = '/login'
  }
}

// Views that load data without their own error state would otherwise show an empty screen when
// a request fails. One shared notice (at most every 6 s) tells the user it was a loading error.
let lastLoadErrorAt = 0
const notifyLoadFailure = (error) => {
  const { config, response } = error
  if (config?.method !== 'get' || config?.silent || axios.isCancel(error)) return
  if (response && [401, 402, 403, 404].includes(response.status)) return
  if (config.url?.startsWith('/ai/')) return
  if (Date.now() - lastLoadErrorAt < 6000) return
  lastLoadErrorAt = Date.now()
  useSnackbar().error(i18n.global.t('common.loadError'))
}

const api = axios.create({
  baseURL: apiBaseURL,
  // Without a timeout, a stalled connection (e.g. the API's host waking up from an idle
  // sleep) leaves axios' promise pending forever — no error and no loading state reset.
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
      if (error.response?.data?.code === 'AI_SUBSCRIPTION_REQUIRED') {
        useSnackbar().info(i18n.global.t('layout.aiProRequired'))
        window.dispatchEvent(new CustomEvent('billing:ai-locked'))
        return Promise.reject(error)
      }
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
      '/auth/biometric/login',
    ].some((path) => originalRequest.url?.includes(path))
    const hadAccessToken = Boolean(originalRequest.headers?.Authorization)

    if (error.response?.status === 401 && hadAccessToken && !isPublicAuthRequest && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const accessToken = await refreshSession()
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        } catch {
          await endSession()
        }
      } else {
        await endSession()
      }
    }
    notifyLoadFailure(error)
    return Promise.reject(error)
  }
)

export default api
