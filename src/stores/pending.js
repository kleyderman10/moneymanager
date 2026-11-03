import { defineStore } from 'pinia'
import { ref } from 'vue'
import { pendingAPI } from '@/api'

// Movimientos detectados a partir de avisos del banco que esperan la confirmación del usuario.
export const usePendingStore = defineStore('pending', () => {
  const items = ref([])
  const count = ref(0)
  const loading = ref(false)

  const fetchAll = async () => {
    loading.value = true
    try {
      items.value = (await pendingAPI.getAll()).data
      count.value = items.value.length
    } finally {
      loading.value = false
    }
  }

  const fetchCount = async () => {
    try {
      count.value = (await pendingAPI.count()).data.count
    } catch { /* la insignia es opcional */ }
  }

  // Devuelve { pending, duplicate }.
  const addFromText = async (text, source) => {
    const { data } = await pendingAPI.create(text, source)
    if (!data.duplicate) {
      items.value.unshift(data.pending)
      count.value += 1
    }
    return data
  }

  const remove = (id) => {
    items.value = items.value.filter((item) => item.id !== id)
    count.value = Math.max(0, count.value - 1)
  }

  const confirm = async (id, data) => {
    const res = await pendingAPI.confirm(id, data)
    remove(id)
    return res.data
  }

  const dismiss = async (id) => {
    await pendingAPI.dismiss(id)
    remove(id)
  }

  return { items, count, loading, fetchAll, fetchCount, addFromText, confirm, dismiss }
})
