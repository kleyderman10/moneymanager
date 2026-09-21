import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { subscriptionsAPI } from '@/api'
import {
  isAppleIAPAvailable,
  isIOSNativePlatform,
  waitForAppleIAPReady,
  purchaseAppleSubscription,
  restoreApplePurchases,
  configureAppleProducts,
} from '@/utils/appleIAP'

export const useSubscriptionStore = defineStore('subscriptions', () => {
  const status = ref(null)
  const payments = ref([])
  const plans = ref([])
  const loading = ref(false)
  const actionLoading = ref(false)
  const error = ref(null)
  const lastFetchedAt = ref(0)
  const appleIAPReady = ref(false)
  const checkingAppleIAP = ref(false)

  const requiresSubscription = computed(() => Boolean(status.value?.requiresSubscription))
  const isReadOnly = computed(() => Boolean(status.value?.isReadOnly ?? requiresSubscription.value))
  const hasEntitlement = computed(() => status.value?.hasEntitlement !== false)
  const isTrialing = computed(() => status.value?.status === 'trialing')
  const showTrialNotice = computed(() => isTrialing.value && status.value.daysRemaining <= 15)

  const reset = () => {
    status.value = null
    payments.value = []
    error.value = null
    lastFetchedAt.value = 0
  }

  const setStatus = (nextStatus) => {
    if (!nextStatus) return
    status.value = nextStatus
    lastFetchedAt.value = Date.now()
  }

  const fetchStatus = async (force = false) => {
    if (!force && status.value && Date.now() - lastFetchedAt.value < 30_000) {
      return status.value
    }

    loading.value = true
    error.value = null
    try {
      const response = await subscriptionsAPI.getStatus()
      status.value = response.data
      lastFetchedAt.value = Date.now()
      return status.value
    } catch (e) {
      error.value = e.response?.data?.message || 'No se pudo consultar la suscripción'
      return null
    } finally {
      loading.value = false
    }
  }

  const fetchPayments = async () => {
    try {
      const response = await subscriptionsAPI.getPayments()
      payments.value = response.data.payments || []
    } catch {
      payments.value = []
    }
  }

  const fetchPlans = async () => {
    try {
      const response = await subscriptionsAPI.getPlans()
      plans.value = response.data.plans || []
    } catch {
      plans.value = []
    }
    configureAppleProducts(plans.value)
  }

  const createCheckout = async (planCode) => {
    // Apple Guideline 3.1.1: digital subscriptions on iOS must go through Apple IAP,
    // never an external checkout. Refuse here as a safety net even if a UI bug ever
    // tries to call this on a native iOS build.
    if (isIOSNativePlatform()) {
      error.value = 'La compra dentro de la app no está disponible en este momento. Inténtalo de nuevo en unos segundos.'
      return { success: false, message: error.value }
    }

    actionLoading.value = true
    error.value = null
    try {
      const response = await subscriptionsAPI.createCheckout(planCode)
      window.location.assign(response.data.checkoutUrl)
      return { success: true }
    } catch (e) {
      error.value = e.response?.data?.message || 'No se pudo iniciar el pago'
      return { success: false, message: error.value }
    } finally {
      actionLoading.value = false
    }
  }

  const ensureAppleIAPReady = async () => {
    if (!isIOSNativePlatform()) {
      appleIAPReady.value = false
      return false
    }
    checkingAppleIAP.value = true
    try {
      appleIAPReady.value = await waitForAppleIAPReady()
      return appleIAPReady.value
    } finally {
      checkingAppleIAP.value = false
    }
  }

  const sync = async () => {
    actionLoading.value = true
    error.value = null
    try {
      const response = await subscriptionsAPI.sync()
      status.value = response.data
      lastFetchedAt.value = Date.now()
      return { success: true, status: status.value }
    } catch (e) {
      error.value = e.response?.data?.message || 'No se pudo verificar el pago'
      return { success: false, message: error.value }
    } finally {
      actionLoading.value = false
    }
  }

  const purchaseWithApple = async (planCode) => {
    actionLoading.value = true
    error.value = null
    try {
      const result = await purchaseAppleSubscription(planCode)
      if (!result.success) {
        error.value = result.message
        return result
      }
      await fetchStatus(true)
      return { success: true }
    } finally {
      actionLoading.value = false
    }
  }

  const restorePurchases = async () => {
    actionLoading.value = true
    error.value = null
    try {
      await ensureAppleIAPReady()
      const result = await restoreApplePurchases()
      if (!result.success) {
        error.value = result.message
        return result
      }
      await fetchStatus(true)
      return { success: true, hasEntitlement: hasEntitlement.value }
    } finally {
      actionLoading.value = false
    }
  }

  const cancel = async () => {
    actionLoading.value = true
    error.value = null
    try {
      const response = await subscriptionsAPI.cancel()
      status.value = response.data
      lastFetchedAt.value = Date.now()
      return { success: true }
    } catch (e) {
      error.value = e.response?.data?.message || 'No se pudo cancelar la suscripción'
      return { success: false, message: error.value }
    } finally {
      actionLoading.value = false
    }
  }

  return {
    status,
    payments,
    plans,
    loading,
    actionLoading,
    error,
    appleIAPReady,
    checkingAppleIAP,
    requiresSubscription,
    isReadOnly,
    hasEntitlement,
    isTrialing,
    showTrialNotice,
    setStatus,
    reset,
    fetchStatus,
    fetchPayments,
    fetchPlans,
    createCheckout,
    isAppleIAPAvailable,
    isIOSNativePlatform,
    ensureAppleIAPReady,
    purchaseWithApple,
    restorePurchases,
    sync,
    cancel,
  }
})
