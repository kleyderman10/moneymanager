import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { subscriptionsAPI } from '@/api'
import { i18n } from '@/i18n'
import {
  isNativeIAPAvailable,
  isNativePlatform,
  waitForNativeIAPReady,
  purchaseNativeSubscription,
  restoreNativePurchases,
  configureNativeProducts,
} from '@/utils/nativeIAP'

const t = i18n.global.t

export const useSubscriptionStore = defineStore('subscriptions', () => {
  const status = ref(null)
  const payments = ref([])
  const plans = ref([])
  const loading = ref(false)
  const actionLoading = ref(false)
  const error = ref(null)
  const lastFetchedAt = ref(0)
  const nativeIAPReady = ref(false)
  const checkingNativeIAP = ref(false)

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
      error.value = e.response?.data?.message || t('subscriptionStore.fetchError')
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
    configureNativeProducts(plans.value)
  }

  const createCheckout = async (planCode) => {
    // Apple Guideline 3.1.1 and Google Play's Payments policy both require digital
    // subscriptions bought inside a native app to go through that store's billing,
    // never an external checkout. Refuse here as a safety net even if a UI bug ever
    // tries to call this on a native build — sending an Android user to the Mercado
    // Pago checkout is grounds for removal from Play, not just a rejection.
    if (isNativePlatform()) {
      error.value = t('subscriptionStore.inAppPurchaseUnavailable')
      return { success: false, message: error.value }
    }

    actionLoading.value = true
    error.value = null
    try {
      const response = await subscriptionsAPI.createCheckout(planCode)
      window.location.assign(response.data.checkoutUrl)
      return { success: true }
    } catch (e) {
      error.value = e.response?.data?.message || t('subscriptionStore.startPaymentError')
      return { success: false, message: error.value }
    } finally {
      actionLoading.value = false
    }
  }

  const ensureNativeIAPReady = async () => {
    if (!isNativePlatform()) {
      nativeIAPReady.value = false
      return false
    }
    checkingNativeIAP.value = true
    try {
      nativeIAPReady.value = await waitForNativeIAPReady()
      return nativeIAPReady.value
    } finally {
      checkingNativeIAP.value = false
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
      error.value = e.response?.data?.message || t('subscriptionStore.verifyPaymentError')
      return { success: false, message: error.value }
    } finally {
      actionLoading.value = false
    }
  }

  const purchaseWithStore = async (planCode) => {
    actionLoading.value = true
    error.value = null
    try {
      const result = await purchaseNativeSubscription(planCode)
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
      await ensureNativeIAPReady()
      const result = await restoreNativePurchases()
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
      error.value = e.response?.data?.message || t('subscriptionStore.cancelError')
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
    nativeIAPReady,
    checkingNativeIAP,
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
    isNativeIAPAvailable,
    isNativePlatform,
    ensureNativeIAPReady,
    purchaseWithStore,
    restorePurchases,
    sync,
    cancel,
  }
})
