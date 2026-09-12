import { defineStore } from 'pinia'
import { ref } from 'vue'
import { registersAPI } from '@/api'

export const useRegistersStore = defineStore('registers', () => {
  const registers = ref([])
  const loading = ref(false)
  const tags = ref([])

  const fetchAll = async (params) => {
    loading.value = true
    try {
      const res = await registersAPI.getAll(params)
      registers.value = res.data
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

  return { registers, loading, tags, fetchAll, fetchTags, create, update, remove, exportCSV }
})
