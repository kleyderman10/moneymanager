import { defineStore } from 'pinia'
import { ref } from 'vue'
import { budgetsAPI } from '@/api'

export const useBudgetsStore = defineStore('budgets', () => {
  const budgets = ref([])
  const loading = ref(false)

  const fetchAll = async (params) => {
    loading.value = true
    try {
      const res = await budgetsAPI.getAll(params)
      budgets.value = res.data
    } finally {
      loading.value = false
    }
  }

  const create = async (data) => {
    const res = await budgetsAPI.create(data)
    budgets.value.unshift(res.data)
    return res.data
  }

  const upsert = async (data) => {
    const res = await budgetsAPI.upsert(data)
    const idx = budgets.value.findIndex(
      (b) => b.month === data.month && b.year === data.year && b.category?._id === (data.category || null)
    )
    if (idx !== -1) budgets.value[idx] = res.data
    else budgets.value.unshift(res.data)
    return res.data
  }

  const update = async (id, data) => {
    const res = await budgetsAPI.update(id, data)
    const idx = budgets.value.findIndex((b) => b._id === id)
    if (idx !== -1) budgets.value[idx] = res.data
    return res.data
  }

  const remove = async (id) => {
    await budgetsAPI.delete(id)
    budgets.value = budgets.value.filter((b) => b._id !== id)
  }

  return { budgets, loading, fetchAll, create, upsert, update, remove }
})
