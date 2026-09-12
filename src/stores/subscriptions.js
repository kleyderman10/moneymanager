import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { subscriptionsAPI } from '@/api'

export const useSubscriptionStore = defineStore('subscriptions', () => {
  const status = ref(null)
  const payments = ref([])
  const loading = ref(false)
  const actionLoading = ref(false)
  const error = ref(null)
  const lastFetchedAt = ref(0)

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

  const createCheckout = async () => {
    actionLoading.value = true
    error.value = null
    try {
      const response = await subscriptionsAPI.createCheckout()
      window.location.assign(response.data.checkoutUrl)
      return { success: true }
    } catch (e) {
      error.value = e.response?.data?.message || 'No se pudo iniciar el pago'
      return { success: false, message: error.value }
    } finally {
      actionLoading.value = false
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
    loading,
    actionLoading,
    error,
    requiresSubscription,
    isReadOnly,
    hasEntitlement,
    isTrialing,
    showTrialNotice,
    setStatus,
    reset,
    fetchStatus,
    fetchPayments,
    createCheckout,
    sync,
    cancel,
  }
})
