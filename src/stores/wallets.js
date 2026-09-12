import { defineStore } from 'pinia'
import { ref } from 'vue'
import { walletsAPI } from '@/api'

export const useWalletsStore = defineStore('wallets', () => {
  const wallets = ref([])
  const loading = ref(false)

  const fetchAll = async () => {
    loading.value = true
    try {
      const res = await walletsAPI.getAll()
      wallets.value = res.data
    } finally {
      loading.value = false
    }
  }

  const create = async (data) => {
    const res = await walletsAPI.create(data)
    wallets.value.unshift(res.data)
    return res.data
  }

  const update = async (id, data) => {
    const res = await walletsAPI.update(id, data)
    const idx = wallets.value.findIndex((w) => w._id === id)
    if (idx !== -1) wallets.value[idx] = res.data
    return res.data
  }

  const transfer = async (data) => {
    const res = await walletsAPI.transfer(data)
    await fetchAll()
    return res.data
  }

  const remove = async (id) => {
    await walletsAPI.delete(id)
    wallets.value = wallets.value.filter((w) => w._id !== id)
  }

  return { wallets, loading, fetchAll, create, update, transfer, remove }
})
