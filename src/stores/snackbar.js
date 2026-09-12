import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSnackbar = defineStore('snackbar', () => {
  const show = ref(false)
  const message = ref('')
  const color = ref('success')
  const timeout = ref(3000)

  const notify = (msg, clr = 'success', t = 3000) => {
    message.value = msg
    color.value = clr
    timeout.value = t
    show.value = true
  }

  const success = (msg) => notify(msg, 'success')
  const error = (msg) => notify(msg, 'error', 5000)
  const info = (msg) => notify(msg, 'info')

  return { show, message, color, timeout, success, error, info }
})
