import { defineStore } from 'pinia'
import { ref } from 'vue'
import { registersAPI } from '@/api'

export const useRegistersStore = defineStore('registers', () => {
  const registers = ref([])
  const loading = ref(false)
  const tags = ref([])
  const total = ref(0)
  const pages = ref(1)
  const page = ref(1)
  const totals = ref({ income: 0, expense: 0 })

  const fetchAll = async (params) => {
    loading.value = true
    try {
      const res = await registersAPI.getAll(params)
      registers.value = res.data.items
      total.value = res.data.total
      pages.value = res.data.pages
      page.value = res.data.page
      totals.value = res.data.totals
    } finally {
      loading.value = false
    }
  }

  const fetchTags = async () => {
    try {
      const res = await registersAPI.getTags()
      tags.value = res.data
    } catch { /* ignore */ }
  }

  const create = async (data) => {
    const res = await registersAPI.create(data)
    registers.value.unshift(res.data)
    return res.data
  }

  const update = async (id, data) => {
    const res = await registersAPI.update(id, data)
    const idx = registers.value.findIndex((r) => r._id === id)
    if (idx !== -1) registers.value[idx] = res.data
    return res.data
  }

  const remove = async (id) => {
    await registersAPI.delete(id)
    registers.value = registers.value.filter((r) => r._id !== id)
  }

  const removeMany = async (ids) => {
    await registersAPI.bulkDelete(ids)
    const removed = new Set(ids)
    registers.value = registers.value.filter((r) => !removed.has(r._id))
  }

  const exportCSV = async (params) => {
    const res = await registersAPI.exportCSV(params)
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'registros.csv')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  return { registers, loading, tags, total, pages, page, totals, fetchAll, fetchTags, create, update, remove, removeMany, exportCSV }
})
