import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Capacitor } from '@capacitor/core'
import { authAPI, webauthnAPI } from '@/api'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { BIOMETRIC_SERVER } from '@/constants/biometric'

// Native apps use the device's own biometric hardware (Keystore/Keychain) to
// guard the refresh token, since WebAuthn platform authenticators aren't
// reliably available inside a Capacitor WebView. The web build keeps using
// WebAuthn passkeys, verified server-side.
//
// Credentials are stored WITHOUT the plugin's `accessControl` (biometric-gated
// Keystore/Keychain) option, and the biometric prompt is triggered explicitly with
// verifyIdentity() before reading them back — this is the pattern the plugin's own
// README recommends ("Secure Usage Pattern"). On Android, storing a credential
// *with* accessControl always launches a live BiometricPrompt, even for a
// background write with no user gesture: setCredentials() with BIOMETRY_ANY/
// BIOMETRY_CURRENT_SET starts an Activity that requires a fresh fingerprint/face
// scan to encrypt the value, every single call. Since this sync runs silently after
// every password login and every silent token refresh, that meant an unexpected,
// easy-to-miss biometric prompt could pop up mid-session; if the user didn't
// complete it, the write was swallowed by the catch below and the Keystore copy
// went stale, so the next Face ID/huella login was rejected as "expired". Plain
// storage keeps the write silent (as intended) on both platforms, and the
// biometric gate still happens at login time via verifyIdentity().
const syncBiometricCredential = async (email, refreshToken) => {
  if (!isNative() || localStorage.getItem('biometricEmail') !== email) return
  try {
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')
    await NativeBiometric.setCredentials({
      username: email,
      password: refreshToken,
      server: BIOMETRIC_SERVER,
    })
  } catch {
    // Best-effort: a normal login/refresh must never fail because of this.
  }
}

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

  const setSession = async (data) => {
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
    // Awaited so the Keystore/Keychain always holds the just-issued (still valid) refresh
    // token before the caller can navigate away or the app gets backgrounded — the refresh
    // token is single-use, so if this write is left in-flight and never completes, the next
    // Face ID/huella attempt sends the already-rotated token and is rejected as "expired".
    await syncBiometricCredential(data.email, data.refreshToken)
  }

  const messageFrom = (e, fallback = 'Ocurrió un error') => e.response?.data?.message || fallback

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
      await setSession(res.data)
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
      await setSession(res.data)
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
      await setSession(res.data)
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
      await setSession(res.data)
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
      await setSession(res.data)
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
        const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')
        await NativeBiometric.setCredentials({
          username: user.value.email,
          password: refreshToken,
          server: BIOMETRIC_SERVER,
        })
        // Marks this account as biometric-enabled so setSession/client.js keep the
        // Keystore/Keychain copy in sync on every later token rotation, not just this one.
        localStorage.setItem('biometricEmail', user.value.email)
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

  // Wipes the local biometric credential and tells the UI to fall back to a password
  // login. Used both when the server rejects the stored refresh token as stale, and
  // when the local credential itself can't be read at all — e.g. an install that
  // registered biometrics before this app version, whose entry lives under the
  // plugin's older accessControl-protected storage and is invisible to the plain
  // getCredentials() read (see syncBiometricCredential above).
  const resetBiometricCredential = async (prefillEmail) => {
    try {
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')
      await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER })
    } catch {
      // Best-effort cleanup; the stale local flag below is what actually hides the button.
    }
    localStorage.removeItem('biometricEmail')
    hasBiometric.value = false
    error.value = 'Tu sesión biométrica expiró. Inicia sesión con tu contraseña para reactivarla.'
    return { success: false, prefillEmail }
  }

  const loginWithBiometric = async () => {
    if (isNative()) {
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')

      try {
        // The prompt is the security gate; the credential read right after it is
        // plain (unprotected) storage, so it doesn't trigger a second, redundant
        // authentication — see the note on syncBiometricCredential above.
        await NativeBiometric.verifyIdentity({
          reason: 'Inicia sesión con Face ID / Huella',
          title: 'Inicia sesión',
        })
      } catch (e) {
        // The user dismissed the prompt or the OS canceled it (e.g. app backgrounded
        // mid-authentication) — not a failure worth alarming them about.
        if (e.code === '15' || e.code === '16') return { success: false, cancelled: true }
        error.value = e.message || 'Error al iniciar con Face ID / Huella'
        return { success: false }
      }

      let credentials
      try {
        credentials = await NativeBiometric.getCredentials({ server: BIOMETRIC_SERVER })
      } catch {
        // Identity is confirmed but there's nothing usable to read — most commonly a
        // pre-upgrade credential this version can no longer see. Recover it like an
        // expired one instead of leaving the user stuck on a Face ID button that can
        // never succeed.
        return resetBiometricCredential()
      }

      try {
        const res = await authAPI.refreshToken({ refreshToken: credentials.password })
        // setSession() re-saves the freshly rotated refresh token into the Keystore/Keychain
        // itself (via syncBiometricCredential), since 'biometricEmail' is already set from
        // registration — no need to duplicate that write here.
        await setSession(res.data)
        hasBiometric.value = true
        return { success: true }
      } catch (e) {
        // A regular logout invalidates the server-side refresh token, which orphans
        // the one held locally. Face ID / huella already confirmed it's the device
        // owner, so prefill the email too and save them from retyping it.
        if (e.response?.data?.code === 'INVALID_REFRESH_TOKEN') {
          return resetBiometricCredential(credentials.username)
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
      await setSession(res.data)
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
        localStorage.removeItem('biometricEmail')
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
