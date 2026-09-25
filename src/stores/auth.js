import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Capacitor } from '@capacitor/core'
import { authAPI, webauthnAPI } from '@/api'
import { resetAllStores } from '@/stores/resetStores'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { BIOMETRIC_SERVER } from '@/constants/biometric'
import { setLanguage, i18n } from '@/i18n'
import { getDeviceId, setTrustToken, clearTrustToken } from '@/utils/device'

const t = i18n.global.t

// Native apps use the device's own biometric hardware (Keystore/Keychain), since WebAuthn
// platform authenticators aren't reliably available inside a Capacitor WebView. The web
// build keeps using WebAuthn passkeys, verified server-side.
const isNative = () => Capacitor.isNativePlatform()

// Face ID/huella works like a banking app: enabling it registers this device with the server
// and stores a per-device secret in the Keychain/Keystore ONCE, protected with
// BIOMETRY_CURRENT_SET. The secret never rotates and doesn't depend on any session, so it
// can't go stale and doesn't expire with inactivity or logout. The OS itself makes it
// unreadable as soon as the phone's enrolled fingerprints/faces change, and the server can
// revoke it (disable, password reset, password change from another device).
//
// Earlier versions stored the rotating refresh token instead, in plain storage, re-saving it
// after every refresh. Those installs are marked by 'biometricEmail' without
// BIOMETRIC_VERSION and are migrated on their next biometric login.
const BIOMETRIC_VERSION = '2'

const clearBiometricFlags = () => {
  localStorage.removeItem('biometricEmail')
  localStorage.removeItem('biometricVersion')
}

const deleteNativeCredential = async () => {
  try {
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')
    await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER })
  } catch {
    // Best-effort cleanup; the local flags are what actually hide the option.
  }
}

const hasLegacyBiometric = () => Boolean(localStorage.getItem('biometricEmail'))
  && localStorage.getItem('biometricVersion') !== BIOMETRIC_VERSION

const parseStoredCredential = (credentials) => {
  try {
    const { email, deviceId } = JSON.parse(credentials.username)
    return { email, deviceId, secret: credentials.password }
  } catch {
    return null
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
      country: data.country,
      language: data.language,
      role: data.role,
      emailVerified: data.emailVerified,
      twoFactorEnabled: data.twoFactorEnabled,
      aiConsentAcceptedAt: data.aiConsentAcceptedAt,
      completedTours: data.completedTours || [],
    }
    if (data.language) setLanguage(data.language)
    // Sent back after an email code is verified on this device: later password logins skip
    // the two-step verification code here.
    setTrustToken(data.deviceToken)
  }

  const messageFrom = (e, fallback = t('common.error')) => e.response?.data?.message || fallback

  const register = async (data) => {
    loading.value = true
    error.value = null
    try {
      const res = await authAPI.register(data)
      return { success: true, ...res.data }
    } catch (e) {
      error.value = messageFrom(e, t('authStore.registerError'))
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
      error.value = messageFrom(e, t('authStore.verifyEmailError'))
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
      return { success: false, message: messageFrom(e, t('authStore.sendCodeError')) }
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
      error.value = messageFrom(e, t('authStore.signInError'))
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
      error.value = messageFrom(e, t('authStore.validateCodeError'))
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
      return { success: false, message: messageFrom(e, t('authStore.sendCodeError')) }
    }
  }

  const resetPassword = async (data) => {
    try {
      const res = await authAPI.resetPassword(data)
      setTrustToken(res.data.deviceToken)
      return { success: true, message: res.data.message }
    } catch (e) {
      return { success: false, message: messageFrom(e, t('authStore.resetPasswordError')) }
    }
  }

  const fetchProfile = async () => {
    try {
      const res = await authAPI.getMe()
      user.value = res.data
      if (res.data.language) setLanguage(res.data.language)
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
      return { success: false, message: messageFrom(e, t('profile.profileUpdateError')) }
    }
  }

  const hasAcceptedAIConsent = computed(() => Boolean(user.value?.aiConsentAcceptedAt))
  const aiConsentDismissed = ref(localStorage.getItem('aiConsentDismissed') === '1')

  const acceptAIConsent = async () => {
    try {
      const res = await authAPI.acceptAIConsent()
      user.value = res.data
      return { success: true }
    } catch (e) {
      return { success: false, message: messageFrom(e, t('authStore.saveResponseError')) }
    }
  }

  const dismissAIConsent = () => {
    aiConsentDismissed.value = true
    localStorage.setItem('aiConsentDismissed', '1')
  }

  const revokeAIConsent = async () => {
    try {
      const res = await authAPI.revokeAIConsent()
      user.value = res.data
      // Revoking clears aiConsentAcceptedAt, which would otherwise make the automatic
      // consent prompt reappear immediately over the app the user just declined on.
      dismissAIConsent()
      return { success: true }
    } catch (e) {
      return { success: false, message: messageFrom(e, t('authStore.revokeConsentError')) }
    }
  }

  const hasCompletedTour = (id) => Boolean(user.value?.completedTours?.includes(id))

  // Marked locally first so the tour can't start again while the request is in flight (or
  // if it fails — it'll just be offered again on the next session).
  const completeTour = async (id) => {
    if (!user.value) return
    user.value = { ...user.value, completedTours: [...(user.value.completedTours || []), id] }
    try {
      const res = await authAPI.completeTour(id)
      user.value = res.data
    } catch {
      // Not worth interrupting the user over.
    }
  }

  const resetTours = async () => {
    try {
      const res = await authAPI.resetTours()
      user.value = res.data
      return { success: true }
    } catch (e) {
      return { success: false, message: messageFrom(e, t('help.resetError')) }
    }
  }

  const deleteAccount = async (password) => {
    try {
      await authAPI.deleteAccount({ password })
    } catch (e) {
      return { success: false, message: messageFrom(e, t('authStore.deleteAccountError')) }
    }

    // The account no longer exists server-side, so every local trace of it has to go
    // too — above all the biometric credential in the Keychain/Keystore, which would
    // otherwise keep offering a Face ID login for a deleted user.
    if (isNative()) await deleteNativeCredential()
    clearBiometricFlags()
    clearTrustToken()
    localStorage.removeItem('webauthnCredentialId')
    localStorage.removeItem('aiConsentDismissed')
    aiConsentDismissed.value = false
    hasBiometric.value = false

    await logout(false)
    return { success: true }
  }

  const requestPasswordChange = async (currentPassword) => {
    try {
      const res = await authAPI.requestPasswordChange({ currentPassword })
      return { success: true, message: res.data.message }
    } catch (e) {
      return { success: false, message: messageFrom(e, t('authStore.sendCodeError')) }
    }
  }

  // This device stays signed in (the server returns a fresh session) and keeps its Face ID/
  // huella; every other device is signed out.
  const changePassword = async (data) => {
    try {
      const res = await authAPI.changePassword(data)
      await setSession(res.data)
      return { success: true, message: res.data.message }
    } catch (e) {
      return { success: false, message: messageFrom(e, t('authStore.updatePasswordError')) }
    }
  }

  const logout = async (notifyServer = true) => {
    // Logout revokes this device's session on the server (other devices stay signed in).
    // Face ID/huella doesn't depend on that session, so it keeps working afterwards — except
    // on installs still using the pre-migration credential, which IS this device's refresh
    // token: revoking it would break the one biometric login that migrates them.
    const legacyBiometric = isNative() && hasLegacyBiometric()
      && localStorage.getItem('biometricEmail') === user.value?.email
    try {
      if (notifyServer && !legacyBiometric && localStorage.getItem('accessToken')) await authAPI.logout(localStorage.getItem('refreshToken'))
    } catch {
      // Local logout must always succeed, even when the token or network has expired.
    } finally {
      user.value = null
      clearTokens()
      useSubscriptionStore().reset()
      resetAllStores(['auth', 'snackbar'])
    }
  }

  const requestTwoFactorSetup = async () => {
    try {
      const res = await authAPI.requestTwoFactorSetup()
      return { success: true, message: res.data.message }
    } catch (e) {
      return { success: false, message: messageFrom(e, t('authStore.sendCodeError')) }
    }
  }

  const confirmTwoFactorSetup = async (code) => {
    try {
      const res = await authAPI.confirmTwoFactorSetup({ code })
      await setSession(res.data)
      return { success: true }
    } catch (e) {
      return { success: false, message: messageFrom(e, t('authStore.enableVerificationError')) }
    }
  }

  const requestTwoFactorDisable = async (currentPassword) => {
    try {
      const res = await authAPI.requestTwoFactorDisable({ currentPassword })
      return { success: true, message: res.data.message }
    } catch (e) {
      return { success: false, message: messageFrom(e, t('authStore.sendCodeError')) }
    }
  }

  const disableTwoFactor = async (currentPassword, code) => {
    try {
      const res = await authAPI.disableTwoFactor({ currentPassword, code })
      await setSession(res.data)
      return { success: true }
    } catch (e) {
      return { success: false, message: messageFrom(e, t('authStore.disableVerificationError')) }
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

  const registerBiometric = async (currentPassword) => {
    if (isNative()) {
      try {
        if (!user.value?.email) return { success: false, message: t('authStore.reloginForBiometric') }
        const deviceId = getDeviceId()
        const res = await authAPI.biometricEnroll({
          currentPassword,
          label: Capacitor.getPlatform(),
        })
        const { NativeBiometric, AccessControl } = await import('@capgo/capacitor-native-biometric')
        // Replaces any older (plain) entry for this server before writing the protected one.
        await deleteNativeCredential()
        // Written once, right after the user tapped "Activar": on Android this shows the
        // biometric prompt to encrypt the secret, which is expected at this moment.
        await NativeBiometric.setCredentials({
          username: JSON.stringify({ email: user.value.email, deviceId }),
          password: res.data.secret,
          server: BIOMETRIC_SERVER,
          accessControl: AccessControl.BIOMETRY_CURRENT_SET,
          title: t('profile.biometricAuth'),
        })
        localStorage.setItem('biometricEmail', user.value.email)
        localStorage.setItem('biometricVersion', BIOMETRIC_VERSION)
        hasBiometric.value = true
        return { success: true }
      } catch (e) {
        if (e.code === '15' || e.code === '16') return { success: false, cancelled: true }
        return { success: false, message: messageFrom(e, e.message || t('authStore.enableBiometricError')) }
      }
    }
    try {
      const optsRes = await webauthnAPI.registerOptions({ currentPassword })
      const { options, challengeToken } = optsRes.data
      const credential = await startRegistration({ optionsJSON: options })
      await webauthnAPI.registerVerify({ credential, challengeToken })
      localStorage.setItem('webauthnCredentialId', credential.id)
      hasBiometric.value = true
      return { success: true }
    } catch (e) {
      return { success: false, message: messageFrom(e, t('authStore.enableBiometricError')) }
    }
  }

  // Wipes the local biometric credential and tells the UI to fall back to a password
  // login, explaining why (the phone's biometrics changed, or it was revoked server-side).
  const resetBiometricCredential = async (prefillEmail, message = t('authStore.biometricChanged')) => {
    await deleteNativeCredential()
    clearBiometricFlags()
    hasBiometric.value = false
    error.value = message
    return { success: false, prefillEmail }
  }

  // One-time path for installs that enabled Face ID/huella before per-device credentials:
  // their plain Keychain/Keystore entry holds a refresh token. If it still works, sign in and
  // ask the user to re-enable biometrics once (password confirmation) in the new format.
  const loginWithLegacyBiometric = async (NativeBiometric) => {
    try {
      await NativeBiometric.verifyIdentity({
        reason: t('authStore.biometricPromptReason'),
        title: t('auth.signIn'),
      })
    } catch (e) {
      if (e.code === '15' || e.code === '16') return { success: false, cancelled: true }
      error.value = e.message || t('auth.biometricLoginError')
      return { success: false }
    }

    let credentials
    try {
      credentials = await NativeBiometric.getCredentials({ server: BIOMETRIC_SERVER })
    } catch {
      return resetBiometricCredential(undefined, t('authStore.biometricSessionExpired'))
    }

    try {
      const res = await authAPI.refreshToken({ refreshToken: credentials.password })
      await setSession(res.data)
      await deleteNativeCredential()
      clearBiometricFlags()
      hasBiometric.value = false
      return { success: true, needsBiometricUpgrade: true }
    } catch (e) {
      if (e.response?.data?.code === 'INVALID_REFRESH_TOKEN') {
        return resetBiometricCredential(credentials.username, t('authStore.biometricSessionExpired'))
      }
      error.value = e.response?.data?.message || e.message || t('auth.biometricLoginError')
      return { success: false }
    }
  }

  const loginWithBiometric = async () => {
    if (isNative()) {
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')
      if (hasLegacyBiometric()) return loginWithLegacyBiometric(NativeBiometric)

      let stored
      try {
        // A single call: the OS shows Face ID/huella and only then decrypts the secret.
        const credentials = await NativeBiometric.getSecureCredentials({
          server: BIOMETRIC_SERVER,
          reason: t('authStore.biometricPromptReason'),
          title: t('auth.signIn'),
        })
        stored = parseStoredCredential(credentials)
      } catch (e) {
        const code = String(e.code)
        // Dismissed by the user or the OS (e.g. app backgrounded) — nothing to report.
        if (['11', '15', '16', '17'].includes(code)) return { success: false, cancelled: true }
        // 21: the OS made the secret unreadable because the enrolled fingerprints/faces
        // changed (BIOMETRY_CURRENT_SET). 3: no biometrics enrolled anymore.
        if (code === '21' || code === '3') return resetBiometricCredential()
        error.value = ['2', '4'].includes(code)
          ? t('authStore.biometricLockedOut')
          : e.message || t('auth.biometricLoginError')
        return { success: false }
      }
      if (!stored?.deviceId || !stored.secret) return resetBiometricCredential()

      try {
        const res = await authAPI.biometricLogin({ deviceId: stored.deviceId, secret: stored.secret })
        await setSession(res.data)
        hasBiometric.value = true
        return { success: true }
      } catch (e) {
        // Disabled from another device, password reset, or changed elsewhere. Face ID /
        // huella already confirmed it's the device owner, so prefill the email.
        if (e.response?.data?.code === 'BIOMETRIC_REVOKED') {
          return resetBiometricCredential(stored.email, t('authStore.biometricRevoked'))
        }
        error.value = e.response?.data?.message || e.message || t('auth.biometricLoginError')
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
      error.value = e.response?.data?.message || e.message || t('auth.biometricLoginError')
      return { success: false }
    }
  }

  const removeBiometric = async () => {
    if (isNative()) {
      try {
        // Best-effort server revocation: the local credential is removed regardless.
        if (localStorage.getItem('accessToken')) {
          await authAPI.biometricRemove(getDeviceId()).catch(() => {})
        }
        const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')
        await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER })
        clearBiometricFlags()
        hasBiometric.value = false
        return { success: true }
      } catch (e) {
        return { success: false, message: e.message || t('authStore.disableError') }
      }
    }
    try {
      await webauthnAPI.removeAll()
      localStorage.removeItem('webauthnCredentialId')
      hasBiometric.value = false
      return { success: true }
    } catch (e) {
      return { success: false, message: messageFrom(e, t('authStore.disableError')) }
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
    hasAcceptedAIConsent,
    acceptAIConsent,
    revokeAIConsent,
    aiConsentDismissed,
    dismissAIConsent,
    hasCompletedTour,
    completeTour,
    resetTours,
    deleteAccount,
    register,
    verifyEmail,
    resendVerification,
    login,
    verifyTwoFactor,
    requestPasswordReset,
    resetPassword,
    fetchProfile,
    updateProfile,
    requestPasswordChange,
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
