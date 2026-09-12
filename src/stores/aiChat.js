import { defineStore } from 'pinia'
import { ref } from 'vue'
import { aiAPI } from '@/api'

export const useAiChatStore = defineStore('aiChat', () => {
  const messages = ref([])
  const loading = ref(false)
  const error = ref(null)
  const visible = ref(false)

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
    messages.value.push({ role: 'user', content: text })
    try {
      const res = await aiAPI.chat(text)
      messages.value = res.data.messages || [...messages.value, { role: 'assistant', content: res.data.reply }]
    } catch (e) {
      error.value = e.response?.data?.message || 'Error de conexión con AI'
      messages.value.push({ role: 'assistant', content: e.response?.data?.message || 'Lo siento, no pude procesar tu consulta. ¿Configuraste la API key de OpenAI en el .env del backend?' })
    }
    loading.value = false
  }

  const clearHistory = async () => {
    try {
      await aiAPI.clearChat()
      messages.value = []
    } catch { /* ignore */ }
  }

  return { messages, loading, error, visible, toggle, open, close, fetchHistory, sendMessage, clearHistory }
})
