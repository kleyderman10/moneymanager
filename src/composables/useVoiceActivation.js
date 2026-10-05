import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useWakeWordStore } from '@/stores/wakeword'

// Coordinates the wake word with the voice assistant so they never hold the microphone together:
//
//   wake word LISTENING  (assistant closed)
//     -> "Oye Flow" -> engine releases the mic -> assistant opens and takes it
//   assistant closed -> wake word resumes
//   app in background -> wake word stopped (first version: foreground only)
//
// `assistant` is the assistant store (needs `visible`), `open` opens the assistant and
// `canListen` tells whether the user may use the assistant (consent given).
export function useVoiceActivation({ assistant, open, canListen }) {
  const wakeWord = useWakeWordStore()
  const foreground = ref(typeof document === 'undefined' ? true : !document.hidden)
  const onVisibility = () => { foreground.value = !document.hidden }

  watch(
    [() => wakeWord.enabled, () => assistant.visible, foreground, canListen],
    () => wakeWord.sync(!assistant.visible && canListen(), foreground.value),
    { immediate: true }
  )

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibility)
    wakeWord.setHandler(() => {
      // A second detection while the assistant is already open is ignored.
      if (assistant.visible || !canListen()) return
      open()
    })
  })

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    wakeWord.setHandler(null)
    wakeWord.stop()
  })

  return { foreground }
}
