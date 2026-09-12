import { defineStore } from 'pinia'
import { ref } from 'vue'
import { goalsAPI } from '@/api'

export const useGoalsStore = defineStore('goals', () => {
  const goals = ref([])
  const loading = ref(false)

  const fetchAll = async () => {
    loading.value = true
    try {
      const res = await goalsAPI.getAll()
      goals.value = res.data
    } finally {
      loading.value = false
    }
  }

  const create = async (data) => {
    const res = await goalsAPI.create(data)
    goals.value.unshift(res.data)
    return res.data
  }

  const update = async (id, data) => {
    const res = await goalsAPI.update(id, data)
    const idx = goals.value.findIndex((g) => g._id === id)
    if (idx !== -1) goals.value[idx] = res.data
    return res.data
  }

  const addProgress = async (id, data) => {
    const res = await goalsAPI.addProgress(id, data)
    const idx = goals.value.findIndex((g) => g._id === id)
    if (idx !== -1) goals.value[idx] = res.data
    return res.data
  }

  const remove = async (id) => {
    await goalsAPI.delete(id)
    goals.value = goals.value.filter((g) => g._id !== id)
  }

  return { goals, loading, fetchAll, create, update, addProgress, remove }
})
