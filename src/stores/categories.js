import { defineStore } from 'pinia'
import { ref } from 'vue'
import { categoriesAPI } from '@/api'

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref([])
  const loading = ref(false)

  const fetchAll = async (params) => {
    loading.value = true
    try {
      const res = await categoriesAPI.getAll(params)
      categories.value = res.data
    } finally {
      loading.value = false
    }
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

  return { categories, loading, fetchAll, create, update, remove }
})
