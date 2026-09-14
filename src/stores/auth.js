import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Capacitor } from '@capacitor/core'
import { authAPI, webauthnAPI } from '@/api'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import { useSubscriptionStore } from '@/stores/subscriptions'

// Native apps use the device's own biometric hardware (Keystore/Keychain) to
// guard the refresh token, since WebAuthn platform authenticators aren't
// reliably available inside a Capacitor WebView. The web build keeps using
// WebAuthn passkeys, verified server-side.
const BIOMETRIC_SERVER = 'online.knexura.moneymanager'
const isNative = () => Capacitor.isNativePlatform()

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const hasBiometric = ref(false)
  const biometricSupported = ref(null)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  const setTokens = (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
  }

  const clearTokens = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  const setSession = (data) => {
    setTokens(data.accessToken, data.refreshToken)
    useSubscriptionStore().reset()
    user.value = {
      _id: data._id,
      name: data.name,
      email: data.email,
      currency: data.currency,
      role: data.role,
      emailVerified: data.emailVerified,
      twoFactorEnabled: data.twoFactorEnabled,
    }
  }

  // TEMPORARY DIAGNOSTIC: when the request never got a server response (e.response is
  // undefined), surface the raw axios failure — code, message and the exact URL that was
  // called — instead of the generic fallback. This is the only way to see the real cause on
  // a device without a Mac/Safari Web Inspector to hand. Revert to the plain fallback once
  // the native login issue is confirmed fixed.
  const messageFrom = (e, fallback = 'Ocurrió un error') => {
    if (e.response?.data?.message) return e.response.data.message
    const url = `${e.config?.baseURL || ''}${e.config?.url || ''}`
    return `${fallback} [diag: ${e.code || 'sin código'} · ${e.message || 'sin mensaje'} · ${url}]`
  }

  const register = async (data) => {
    loading.value = true
    error.value = null
    try {
      const res = await authAPI.register(data)
      return { success: true, ...res.data }
    } catch (e) {
      error.value = messageFrom(e, 'Error al registrarse')
      return { success: false, message: error.value, code: e.response?.data?.code }
    } finally {
      loading.value = false
    }
  }

  const verifyEmail = async (data) => {
    loading.value = true
    error.value = null
    try {
      const res = await authAPI.verifyEmail(data)
      setSession(res.data)
      return { success: true }
    } catch (e) {
      error.value = messageFrom(e, 'No se pudo verificar el correo')
      return { success: false, message: error.value }
    } finally {
      loading.value = false
    }
  }

  const resendVerification = async (email) => {
    try {
      const res = await authAPI.resendVerification({ email })
      return { success: true, message: res.data.message }
    } catch (e) {
      return { success: false, message: messageFrom(e, 'No se pudo enviar el código') }
    }
  }

  const login = async (data) => {
    loading.value = true
    error.value = null
    try {
      const res = await authAPI.login(data)
      if (res.data.requiresTwoFactor) return { success: true, ...res.data }
      setSession(res.data)
      return { success: true }
    } catch (e) {
      error.value = messageFrom(e, 'Error al iniciar sesión')
      return {
        success: false,
        message: error.value,
        code: e.response?.data?.code,
        requiresEmailVerification: e.response?.data?.code === 'EMAIL_NOT_VERIFIED',
      }
    } finally {
      loading.value = false
    }
  }

  const verifyTwoFactor = async (challengeToken, code) => {
    loading.value = true
    error.value = null
    try {
      const res = await authAPI.verifyTwoFactor({ challengeToken, code })
      setSession(res.data)
      return { success: true }
    } catch (e) {
      error.value = messageFrom(e, 'No se pudo validar el código')
      return { success: false, message: error.value }
    } finally {
      loading.value = false
    }
  }

  const requestPasswordReset = async (email) => {
    try {
      const res = await authAPI.forgotPassword({ email })
      return { success: true, message: res.data.message }
    } catch (e) {
      return { success: false, message: messageFrom(e, 'No se pudo enviar el código') }
    }
  }

  const resetPassword = async (data) => {
    try {
      const res = await authAPI.resetPassword(data)
      return { success: true, message: res.data.message }
    } catch (e) {
      return { success: false, message: messageFrom(e, 'No se pudo restablecer la contraseña') }
    }
  }

  const fetchProfile = async () => {
    try {
      const res = await authAPI.getMe()
      user.value = res.data
    } catch {
      await logout(false)
    }
  }

  const updateProfile = async (data) => {
    try {
      const res = await authAPI.updateProfile(data)
      user.value = res.data
      return { success: true }
    } catch (e) {
      return { success: false, message: messageFrom(e, 'Error al actualizar el perfil') }
    }
  }

  const changePassword = async (data) => {
    try {
      const res = await authAPI.changePassword(data)
      return { success: true, message: res.data.message }
    } catch (e) {
      return { success: false, message: messageFrom(e, 'No se pudo actualizar la contraseña') }
    }
  }

  const logout = async (notifyServer = true) => {
    try {
      if (notifyServer && localStorage.getItem('accessToken')) await authAPI.logout()
    } catch {
      // Local logout must always succeed, even when the token or network has expired.
    } finally {
      user.value = null
      clearTokens()
      useSubscriptionStore().reset()
    }
  }

  const requestTwoFactorSetup = async () => {
    try {
      const res = await authAPI.requestTwoFactorSetup()
      return { success: true, message: res.data.message }
    } catch (e) {
      return { success: false, message: messageFrom(e, 'No se pudo enviar el código') }
    }
  }

  const confirmTwoFactorSetup = async (code) => {
    try {
      const res = await authAPI.confirmTwoFactorSetup({ code })
      setSession(res.data)
      return { success: true }
    } catch (e) {
      return { success: false, message: messageFrom(e, 'No se pudo activar la verificación') }
    }
  }

  const requestTwoFactorDisable = async (currentPassword) => {
    try {
      const res = await authAPI.requestTwoFactorDisable({ currentPassword })
      return { success: true, message: res.data.message }
    } catch (e) {
      return { success: false, message: messageFrom(e, 'No se pudo enviar el código') }
    }
  }

  const disableTwoFactor = async (currentPassword, code) => {
    try {
      const res = await authAPI.disableTwoFactor({ currentPassword, code })
      setSession(res.data)
      return { success: true }
    } catch (e) {
      return { success: false, message: messageFrom(e, 'No se pudo desactivar la verificación') }
    }
  }

  const checkBiometricSupport = async () => {
    if (biometricSupported.value !== null) return biometricSupported.value
    try {
      if (isNative()) {
        const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')
        const result = await NativeBiometric.isAvailable()
        biometricSupported.value = result.isAvailable
      } else {
        const { platformAuthenticatorIsAvailable } = await import('@simplewebauthn/browser')
        biometricSupported.value = await platformAuthenticatorIsAvailable()
      }
    } catch {
      biometricSupported.value = false
    }
    return biometricSupported.value
  }

  const checkBiometricStatus = async () => {
    try {
      if (isNative()) {
        const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')
        const result = await NativeBiometric.isCredentialsSaved({ server: BIOMETRIC_SERVER })
        hasBiometric.value = result.isSaved
        return
      }
      const res = await webauthnAPI.status()
      hasBiometric.value = res.data.hasBiometric
    } catch {
      hasBiometric.value = false
    }
  }

  const registerBiometric = async () => {
    if (isNative()) {
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken || !user.value?.email) {
          return { success: false, message: 'Inicia sesión nuevamente antes de activar la biometría' }
        }
        const { NativeBiometric, AccessControl } = await import('@capgo/capacitor-native-biometric')
        await NativeBiometric.setCredentials({
          username: user.value.email,
          password: refreshToken,
          server: BIOMETRIC_SERVER,
          accessControl: AccessControl.BIOMETRY_ANY,
        })
        hasBiometric.value = true
        return { success: true }
      } catch (e) {
        return { success: false, message: e.message || 'No se pudo activar Face ID / Huella' }
      }
    }
    try {
      const optsRes = await webauthnAPI.registerOptions()
      const { options, challengeToken } = optsRes.data
      const credential = await startRegistration({ optionsJSON: options })
      await webauthnAPI.registerVerify({ credential, challengeToken })
      localStorage.setItem('webauthnCredentialId', credential.id)
      hasBiometric.value = true
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message || 'No se pudo activar Face ID / Huella' }
    }
  }

  const loginWithBiometric = async () => {
    if (isNative()) {
      try {
        const { NativeBiometric, AccessControl } = await import('@capgo/capacitor-native-biometric')
        const credentials = await NativeBiometric.getSecureCredentials({
          server: BIOMETRIC_SERVER,
          reason: 'Inicia sesión con Face ID / Huella',
        })
        const res = await authAPI.refreshToken({ refreshToken: credentials.password })
        setSession(res.data)
        // The refresh token rotates on every use, so the stored credential must be updated
        // or the next biometric login will be rejected as an already-used token.
        await NativeBiometric.setCredentials({
          username: credentials.username,
          password: res.data.refreshToken,
          server: BIOMETRIC_SERVER,
          accessControl: AccessControl.BIOMETRY_ANY,
        })
        hasBiometric.value = true
        return { success: true }
      } catch (e) {
        // A regular logout invalidates the server-side refresh token, which orphans
        // the one held in the Keystore/Keychain. Clear it so the UI stops offering a
        // biometric login that can never succeed until the user signs in again.
        if (e.response?.data?.code === 'INVALID_REFRESH_TOKEN') {
          try {
            const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')
            await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER })
          } catch {
            // Best-effort cleanup; ignore failures here and surface the original error below.
          }
          hasBiometric.value = false
          error.value = 'Tu sesión biométrica expiró. Inicia sesión con tu contraseña para reactivarla.'
          return { success: false }
        }
        error.value = e.response?.data?.message || e.message || 'Error al iniciar con Face ID / Huella'
        return { success: false }
      }
    }
    try {
      const credentialId = localStorage.getItem('webauthnCredentialId')
      const optsRes = await webauthnAPI.loginOptions(credentialId)
      const { options, challengeToken } = optsRes.data
      const credential = await startAuthentication({ optionsJSON: options })
      const res = await webauthnAPI.loginVerify({ credential, challengeToken })
      setSession(res.data)
      hasBiometric.value = true
      return { success: true }
    } catch (e) {
      error.value = e.response?.data?.message || e.message || 'Error al iniciar con Face ID / Huella'
      return { success: false }
    }
  }

  const removeBiometric = async () => {
    if (isNative()) {
      try {
        const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')
        await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER })
        hasBiometric.value = false
        return { success: true }
      } catch (e) {
        return { success: false, message: e.message || 'Error al desactivar' }
      }
    }
    try {
      await webauthnAPI.removeAll()
      localStorage.removeItem('webauthnCredentialId')
      hasBiometric.value = false
      return { success: true }
    } catch (e) {
      return { success: false, message: messageFrom(e, 'Error al desactivar') }
    }
  }

  return {
    user,
    loading,
    error,
    hasBiometric,
    biometricSupported,
    isAuthenticated,
    isAdmin,
    register,
    verifyEmail,
    resendVerification,
    login,
    verifyTwoFactor,
    requestPasswordReset,
    resetPassword,
    fetchProfile,
    updateProfile,
    changePassword,
    logout,
    requestTwoFactorSetup,
    confirmTwoFactorSetup,
    requestTwoFactorDisable,
    disableTwoFactor,
    checkBiometricSupport,
    checkBiometricStatus,
    registerBiometric,
    loginWithBiometric,
    removeBiometric,
  }
})
