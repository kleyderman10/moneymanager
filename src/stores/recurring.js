import { defineStore } from 'pinia'
import { ref } from 'vue'
import { recurringAPI } from '@/api'

export const useRecurringStore = defineStore('recurring', () => {
  const transactions = ref([])
  const upcoming = ref([])
  const loading = ref(false)

  const fetchAll = async () => {
    loading.value = true
    try {
      const res = await recurringAPI.getAll()
      transactions.value = res.data
    } finally {
      loading.value = false
    }
  }

  const fetchUpcoming = async (days = 7) => {
    try {
      const res = await recurringAPI.getUpcoming(days)
      upcoming.value = res.data
    } catch { /* ignore */ }
  }

  const create = async (data) => {
    const res = await recurringAPI.create(data)
    transactions.value.unshift(res.data)
    return res.data
  }

  const update = async (id, data) => {
    const res = await recurringAPI.update(id, data)
    const idx = transactions.value.findIndex((t) => t._id === id)
    if (idx !== -1) transactions.value[idx] = res.data
    return res.data
  }

  const remove = async (id) => {
    await recurringAPI.delete(id)
    transactions.value = transactions.value.filter((t) => t._id !== id)
  }

  return { transactions, upcoming, loading, fetchAll, fetchUpcoming, create, update, remove }
})
