import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI, webauthnAPI } from '@/api'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import { useSubscriptionStore } from '@/stores/subscriptions'

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
      const { platformAuthenticatorIsAvailable } = await import('@simplewebauthn/browser')
      biometricSupported.value = await platformAuthenticatorIsAvailable()
    } catch {
      biometricSupported.value = false
    }
    return biometricSupported.value
  }

  const checkBiometricStatus = async () => {
    try {
      const res = await webauthnAPI.status()
      hasBiometric.value = res.data.hasBiometric
    } catch {
      hasBiometric.value = false
    }
  }

  const registerBiometric = async () => {
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
