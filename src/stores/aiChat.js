import { defineStore } from 'pinia'
import { ref } from 'vue'
import { aiAPI } from '@/api'
import { i18n } from '@/i18n'

const t = i18n.global.t

export const useAiChatStore = defineStore('aiChat', () => {
  const messages = ref([])
  const loading = ref(false)
  const error = ref(null)
  const visible = ref(false)
  const lastFailed = ref(null)

  const toggle = () => { visible.value = !visible.value }
  const open = () => { visible.value = true }
  const close = () => { visible.value = false }

  const fetchHistory = async () => {
    try {
      const res = await aiAPI.getChatHistory()
      messages.value = res.data
    } catch { /* ignore */ }
  }

  const sendMessage = async (text) => {
    loading.value = true
    error.value = null
    lastFailed.value = null
    messages.value.push({ role: 'user', content: text, timestamp: new Date().toISOString() })
    try {
      const res = await aiAPI.chat(text)
      messages.value = res.data.messages || [...messages.value, { role: 'assistant', content: res.data.reply }]
    } catch (e) {
      // The UI shows a friendly retry card; the technical detail stays in the console.
      console.error('AI chat error:', e.response?.data?.message || e.message)
      lastFailed.value = text
      error.value = e.response?.data?.message || t('aiChatStore.connectionError')
    }
    loading.value = false
  }

  const retry = async () => {
    const text = lastFailed.value
    if (!text || loading.value) return
    lastFailed.value = null
    const last = messages.value[messages.value.length - 1]
    if (last?.role === 'user' && last.content === text) messages.value.pop()
    await sendMessage(text)
  }

  const clearHistory = async () => {
    try {
      await aiAPI.clearChat()
      messages.value = []
      error.value = null
      lastFailed.value = null
    } catch { /* ignore */ }
  }

  return { messages, loading, error, visible, toggle, open, close, fetchHistory, sendMessage, retry, lastFailed, clearHistory }
})
