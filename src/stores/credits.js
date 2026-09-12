import { defineStore } from 'pinia'
import { ref } from 'vue'
import { creditsAPI } from '@/api'

export const useCreditsStore = defineStore('credits', () => {
  const credits = ref([])
  const loading = ref(false)

  const fetchAll = async () => {
    loading.value = true
    try {
      const res = await creditsAPI.getAll()
      credits.value = res.data
    } finally {
      loading.value = false
    }
  }

  const create = async (data) => {
    const res = await creditsAPI.create(data)
    credits.value.unshift(res.data)
    return res.data
  }

  const update = async (id, data) => {
    const res = await creditsAPI.update(id, data)
    const index = credits.value.findIndex((item) => item._id === id)
    if (index !== -1) credits.value[index] = res.data
    return res.data
  }

  const addPayment = async (id, data) => {
    const res = await creditsAPI.addPayment(id, data)
    const index = credits.value.findIndex((item) => item._id === id)
    if (index !== -1) credits.value[index] = res.data
    return res.data
  }

  const deletePayment = async (id, paymentId) => {
    const res = await creditsAPI.deletePayment(id, paymentId)
    const index = credits.value.findIndex((item) => item._id === id)
    if (index !== -1) credits.value[index] = res.data
    return res.data
  }

  const remove = async (id) => {
    await creditsAPI.delete(id)
    credits.value = credits.value.filter((item) => item._id !== id)
  }

  return { credits, loading, fetchAll, create, update, addPayment, deletePayment, remove }
})
