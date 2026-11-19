import { defineStore } from 'pinia'
import { ref } from 'vue'
import { aiAPI } from '@/api'
import { i18n } from '@/i18n'
import { readSSE } from '@/utils/sse'

const t = i18n.global.t

export const useAiChatStore = defineStore('aiChat', () => {
  const messages = ref([])
  const loading = ref(false)
  const error = ref(null)
  const visible = ref(false)
  const lastFailed = ref(null)
  // streaming: ya llegó texto de la respuesta · toolRunning: el modelo está consultando tus datos.
  const streaming = ref(false)
  const toolRunning = ref(false)
  // Medidor: tamaño de la conversación y consultas restantes (lo envía el servidor en cada respuesta).
  const usage = ref(null)
  // Sugerencias de seguimiento de la última respuesta y tarjetas que llegan antes del texto.
  const suggestions = ref([])
  let pendingBlocks = []
  let controller = null
  // Brief answers use fewer tokens; the choice is remembered on this device.
  const readBrief = () => { try { return localStorage.getItem('aiChatBrief') === '1' } catch { return false } }
  const brief = ref(readBrief())
  const setBrief = (value) => {
    brief.value = !!value
    try { localStorage.setItem('aiChatBrief', brief.value ? '1' : '0') } catch { /* storage unavailable */ }
  }

  const toggle = () => { visible.value = !visible.value }
  const open = () => { visible.value = true }
  const close = () => { visible.value = false }

  // Conversations: the list, the open one and whether the next message starts a new one.
  const conversations = ref([])
  const currentId = ref(null)
  const startNew = ref(false)

  const fetchConversations = async () => {
    try {
      const res = await aiAPI.getConversations()
      conversations.value = res.data
    } catch { /* ignore */ }
  }

  const openConversation = async (id) => {
    if (loading.value) return
    try {
      const res = await aiAPI.getConversation(id)
      messages.value = res.data.messages
      currentId.value = res.data.id
      if (usage.value) usage.value = { ...usage.value, context: null }
      startNew.value = false
      suggestions.value = []
      error.value = null
      lastFailed.value = null
    } catch { /* ignore */ }
  }

  // Opening the chat shows the most recent conversation, like before the list existed.
  const fetchHistory = async () => {
    await fetchConversations()
    if (currentId.value && conversations.value.some((c) => c.id === currentId.value)) return
    if (startNew.value) return
    if (conversations.value.length) await openConversation(conversations.value[0].id)
    else { messages.value = []; currentId.value = null }
  }

  const newConversation = () => {
    if (loading.value) return
    messages.value = []
    currentId.value = null
    startNew.value = true
    suggestions.value = []
    if (usage.value) usage.value = { ...usage.value, context: null }
    error.value = null
    lastFailed.value = null
  }

  const deleteConversation = async (id) => {
    try {
      await aiAPI.deleteConversation(id)
    } catch { return }
    conversations.value = conversations.value.filter((c) => c.id !== id)
    if (currentId.value === id) {
      messages.value = []
      currentId.value = null
      error.value = null
      lastFailed.value = null
      if (conversations.value.length) await openConversation(conversations.value[0].id)
    }
  }

  const adopt = (data) => {
    if (data?.usage) usage.value = data.usage
    if (data?.conversationId) {
      currentId.value = data.conversationId
      startNew.value = false
    }
  }

  const conversationOptions = () => ({
    conversationId: currentId.value,
    newConversation: !currentId.value && startNew.value,
  })

  // Reads the SSE stream into a growing assistant message. Returns false when the server did not
  // accept the stream (not 2xx): the caller then repeats the request through axios.
  const streamReply = async (text) => {
    const response = await aiAPI.chatStream(text, { ...conversationOptions(), brief: brief.value, signal: controller.signal })
    if (!response.ok) return false
    let reply = null
    for await (const event of readSSE(response)) {
      if (event.type === 'text') {
        if (!reply) {
          messages.value.push({ role: 'assistant', content: '', timestamp: new Date().toISOString() })
          if (pendingBlocks.length) messages.value[messages.value.length - 1].blocks = pendingBlocks
          reply = messages.value[messages.value.length - 1]
          streaming.value = true
        }
        reply.content += event.delta
      } else if (event.type === 'tool') {
        toolRunning.value = event.status === 'start'
      } else if (event.type === 'block') {
        pendingBlocks = [...pendingBlocks, event.block]
      } else if (event.type === 'meta') {
        adopt(event)
      } else if (event.type === 'done') {
        adopt(event)
        if (event.messages?.length && !event.stopped) messages.value = event.messages
        suggestions.value = event.suggestions || []
      } else if (event.type === 'error') {
        throw new Error(event.message || t('aiChatStore.connectionError'))
      }
    }
    return true
  }

  const sendMessage = async (text) => {
    loading.value = true
    error.value = null
    lastFailed.value = null
    streaming.value = false
    toolRunning.value = false
    suggestions.value = []
    pendingBlocks = []
    messages.value.push({ role: 'user', content: text, timestamp: new Date().toISOString() })
    controller = new AbortController()
    try {
      const streamed = await streamReply(text)
      if (!streamed) {
        const res = await aiAPI.chat(text, { ...conversationOptions(), brief: brief.value })
        adopt(res.data)
        messages.value = res.data.messages || [...messages.value, { role: 'assistant', content: res.data.reply }]
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        // Stopped by the user: what already arrived stays in the conversation.
      } else {
        // The UI shows a friendly retry card; the technical detail stays in the console.
        console.error('AI chat error:', e.response?.data?.message || e.message)
        lastFailed.value = text
        error.value = e.response?.data?.message || (e.response ? t('aiChatStore.connectionError') : e.message) || t('aiChatStore.connectionError')
      }
    }
    controller = null
    streaming.value = false
    toolRunning.value = false
    loading.value = false
    fetchConversations()
  }

  const stop = () => controller?.abort()

  // Repite la última pregunta para obtener otra respuesta.
  const regenerate = async () => {
    if (loading.value) return
    const lastUser = [...messages.value].reverse().find((m) => m.role === 'user')
    if (lastUser) await sendMessage(lastUser.content)
  }

  const retry = async () => {
    const text = lastFailed.value
    if (!text || loading.value) return
    lastFailed.value = null
    const last = messages.value[messages.value.length - 1]
    if (last?.role === 'user' && last.content === text) messages.value.pop()
    await sendMessage(text)
  }

  // Header trash: deletes the open conversation (or just empties an unsaved one).
  const clearHistory = async () => {
    if (currentId.value) return deleteConversation(currentId.value)
    messages.value = []
    error.value = null
    lastFailed.value = null
    return undefined
  }

  return { messages, conversations, currentId, fetchConversations, openConversation, newConversation, deleteConversation, loading, streaming, toolRunning, usage, suggestions, regenerate, stop, error, visible, brief, setBrief, toggle, open, close, fetchHistory, sendMessage, retry, lastFailed, clearHistory }
})
