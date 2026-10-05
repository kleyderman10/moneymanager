import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSnackbar = defineStore('snackbar', () => {
  const show = ref(false)
  const message = ref('')
  const color = ref('success')
  const timeout = ref(3000)
  // Optional single action (e.g. "Undo"): { label, handler }.
  const action = ref(null)

  const notify = (msg, clr = 'success', t = 3000, act = null) => {
    message.value = msg
    color.value = clr
    timeout.value = t
    action.value = act
    show.value = true
  }

  const withAction = (msg, label, handler) => notify(msg, 'success', 8000, { label, handler })

  const success = (msg) => notify(msg, 'success')
  const error = (msg) => notify(msg, 'error', 5000)
  const info = (msg) => notify(msg, 'info')

  return { show, message, color, timeout, action, success, error, info, withAction }
})
