import { defineStore } from 'pinia'
import { ref } from 'vue'
import { splitsAPI } from '@/api'

export const useSplitsStore = defineStore('splits', () => {
  const splits = ref([])
  const received = ref([])
  const loading = ref(false)

  const fetchAll = async () => {
    loading.value = true
    try {
      const [owned, inbox] = await Promise.all([splitsAPI.getAll(), splitsAPI.getReceived()])
      splits.value = owned.data
      received.value = inbox.data
    } finally {
      loading.value = false
    }
  }

  const replace = (split) => {
    const index = splits.value.findIndex((item) => item.id === split.id)
    if (index !== -1) splits.value[index] = split
  }

  const create = async (data) => {
    const res = await splitsAPI.create(data)
    splits.value.unshift(res.data)
    return res.data
  }

  const remove = async (id) => {
    await splitsAPI.delete(id)
    splits.value = splits.value.filter((item) => item.id !== id)
  }

  const markPaid = async (id, participantId) => {
    const res = await splitsAPI.markPaid(id, participantId)
    replace(res.data)
    return res.data
  }

  const respond = async (item, action, data) => {
    if (action === 'accept') await splitsAPI.accept(item.id, item.participantId, data)
    else await splitsAPI.decline(item.id, item.participantId)
    received.value = received.value.filter((entry) => entry.participantId !== item.participantId)
  }

  return { splits, received, loading, fetchAll, create, remove, markPaid, respond }
})
