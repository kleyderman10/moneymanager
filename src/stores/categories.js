import { defineStore } from 'pinia'
import { ref } from 'vue'
import { categoriesAPI } from '@/api'

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref([])
  const loading = ref(false)
  // Categories change rarely and every mutation below keeps the list in sync, so screens that
  // only need to read them reuse the loaded list for a few minutes instead of re-requesting it.
  const loadedAt = ref(0)
  const CACHE_MS = 5 * 60 * 1000

  const fetchAll = async (params) => {
    loading.value = true
    try {
      const res = await categoriesAPI.getAll(params)
      categories.value = res.data
      if (!params) loadedAt.value = Date.now()
    } finally {
      loading.value = false
    }
  }

  const fetchCached = async () => {
    if (!loadedAt.value || Date.now() - loadedAt.value > CACHE_MS) await fetchAll()
    return categories.value
  }

  const create = async (data) => {
    const res = await categoriesAPI.create(data)
    categories.value.unshift(res.data)
    return res.data
  }

  const update = async (id, data) => {
    const res = await categoriesAPI.update(id, data)
    const idx = categories.value.findIndex((c) => c._id === id)
    if (idx !== -1) categories.value[idx] = res.data
    return res.data
  }

  const remove = async (id) => {
    await categoriesAPI.delete(id)
    categories.value = categories.value.filter((c) => c._id !== id)
  }

  return { categories, loading, loadedAt, fetchAll, fetchCached, create, update, remove }
})
