import { defineStore } from 'pinia'
import { ref } from 'vue'
import { assistantAPI } from '@/api'
import { useCategoriesStore } from '@/stores/categories'

// Global voice/text assistant. The backend interprets what the user said and returns one of:
//   answer / clarify → a reply to show
//   navigate         → a route to open
//   confirm          → a pending action with an editable preview
// Write actions only run after confirm(); afterwards dataVersion is bumped so the layout
// remounts the current view and it reloads its data with its own filters.
export const ROUTE_PATHS = {
  dashboard: '/',
  transactions: '/transactions',
  categories: '/categories',
  budgets: '/budgets',
  goals: '/goals',
  wallets: '/wallets',
  credits: '/credits',
  recurring: '/recurring',
  reports: '/reports',
  simulators: '/simulators?tab=capacity',
  profile: '/profile',
  subscription: '/subscription',
  help: '/help',
}

export const useAssistantStore = defineStore('assistant', () => {
  const visible = ref(false)
  // idle | listening | thinking | result | error
  const state = ref('idle')
  const transcript = ref('')
  const result = ref(null)
  const busy = ref(false)
  const dataVersion = ref(0)
  const lastDone = ref(null)
  // The whole conversation as shown on screen: [{ role: 'user' | 'assistant', content }].
  // The last turns are also sent to the server so follow-up answers keep context.
  const thread = ref([])
  const history = ref([])
  // Open question from the assistant (missing account/category): its options, and the draft
  // state the server needs back together with the answer.
  const question = ref(null)
  const pending = ref(null)

  const clearConversation = () => {
    thread.value = []
    history.value = []
    question.value = null
    pending.value = null
  }
  const addTurn = (role, content) => {
    if (!content) return
    thread.value = [...thread.value, { role, content }].slice(-20)
    history.value = [...history.value, { role, content }].slice(-6)
  }

  const open = () => {
    visible.value = true
    if (state.value !== 'thinking') { reset(); clearConversation() }
  }
  const close = () => { visible.value = false; clearConversation() }
  const reset = () => {
    state.value = 'idle'
    transcript.value = ''
    result.value = null
  }

  const errorMessage = (e) => e?.response?.data?.message || null

  const interpret = async (text, route) => {
    const value = (text || '').trim()
    if (!value) return null
    transcript.value = value
    state.value = 'thinking'
    const answeringQuestion = pending.value
    const priorHistory = history.value
    addTurn('user', value)
    question.value = null
    try {
      const res = await assistantAPI.interpret(value, route, priorHistory, answeringQuestion)
      result.value = res.data
      if (res.data?.type === 'clarify' && res.data.pending) {
        pending.value = res.data.pending
        question.value = res.data.question || null
      } else {
        pending.value = null
      }
      if (['answer', 'clarify'].includes(res.data?.type)) addTurn('assistant', res.data.reply)
      state.value = 'result'
      return res.data
    } catch (e) {
      result.value = { type: 'error', reply: errorMessage(e) }
      state.value = 'error'
      return null
    }
  }

  const confirm = async (params) => {
    if (result.value?.type !== 'confirm') return null
    busy.value = true
    try {
      const res = await assistantAPI.confirm(result.value.actionId, params)
      lastDone.value = res.data
      dataVersion.value += 1
      // The assistant can create categories server-side, so the cached list is stale.
      useCategoriesStore().loadedAt = 0
      result.value = { type: 'done', reply: res.data.reply }
      addTurn('assistant', res.data.reply)
      return res.data
    } catch (e) {
      // Keep the preview so the user can fix it (e.g. card limit exceeded) and retry.
      result.value = { ...result.value, error: errorMessage(e) }
      return null
    } finally {
      busy.value = false
    }
  }

  const cancel = async () => {
    const pending = result.value?.type === 'confirm' ? result.value.actionId : null
    reset()
    close()
    if (pending) await assistantAPI.cancel(pending).catch(() => {})
  }

  const undo = async () => {
    const res = await assistantAPI.undo()
    if (res.data?.type === 'undone') {
      dataVersion.value += 1
      useCategoriesStore().loadedAt = 0
    }
    return res.data
  }

  return {
    visible, state, transcript, result, busy, dataVersion, lastDone, history, thread, question, pending,
    open, close, reset, clearConversation, interpret, confirm, cancel, undo,
  }
})
