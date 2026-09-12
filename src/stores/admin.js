import { defineStore } from 'pinia'
import { ref } from 'vue'
import { adminAPI } from '@/api'

export const useAdminStore = defineStore('admin', () => {
  const overview = ref(null)
  const users = ref([])
  const usersMeta = ref({ page: 1, pageSize: 20, total: 0, totalPages: 1 })
  const subscriptions = ref([])
  const subscriptionsMeta = ref({ page: 1, pageSize: 20, total: 0, totalPages: 1 })
  const loading = ref(false)
  const error = ref(null)

  const fetchOverview = async () => {
    try {
      const res = await adminAPI.getOverview()
      overview.value = res.data
    } catch (e) {
      error.value = e.response?.data?.message || 'No se pudo cargar el resumen'
    }
  }

  const fetchUsers = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const res = await adminAPI.getUsers(params)
      users.value = res.data.items
      usersMeta.value = {
        page: res.data.page,
        pageSize: res.data.pageSize,
        total: res.data.total,
        totalPages: res.data.totalPages,
      }
    } catch (e) {
      error.value = e.response?.data?.message || 'No se pudieron cargar los usuarios'
    } finally {
      loading.value = false
    }
  }

  const setUserStatus = async (id, isActive) => {
    try {
      const res = await adminAPI.setUserStatus(id, isActive)
      const index = users.value.findIndex((u) => u._id === id)
      if (index !== -1) users.value[index] = { ...users.value[index], ...res.data }
      return { success: true }
    } catch (e) {
      return { success: false, message: e.response?.data?.message || 'No se pudo actualizar el usuario' }
    }
  }

  const setUserRole = async (id, role) => {
    try {
      const res = await adminAPI.setUserRole(id, role)
      const index = users.value.findIndex((u) => u._id === id)
      if (index !== -1) users.value[index] = { ...users.value[index], ...res.data }
      return { success: true }
    } catch (e) {
      return { success: false, message: e.response?.data?.message || 'No se pudo actualizar el rol' }
    }
  }

  const fetchSubscriptions = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const res = await adminAPI.getSubscriptions(params)
      subscriptions.value = res.data.items
      subscriptionsMeta.value = {
        page: res.data.page,
        pageSize: res.data.pageSize,
        total: res.data.total,
        totalPages: res.data.totalPages,
      }
    } catch (e) {
      error.value = e.response?.data?.message || 'No se pudieron cargar las suscripciones'
    } finally {
      loading.value = false
    }
  }

  const updateSubscription = async (id, data) => {
    try {
      const res = await adminAPI.updateSubscription(id, data)
      const index = subscriptions.value.findIndex((s) => s.id === id)
      if (index !== -1) subscriptions.value[index] = { ...subscriptions.value[index], ...res.data }
      return { success: true }
    } catch (e) {
      return { success: false, message: e.response?.data?.message || 'No se pudo actualizar la suscripción' }
    }
  }

  return {
    overview,
    users,
    usersMeta,
    subscriptions,
    subscriptionsMeta,
    loading,
    error,
    fetchOverview,
    fetchUsers,
    setUserStatus,
    setUserRole,
    fetchSubscriptions,
    updateSubscription,
  }
})
