import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Hands-free activation with Picovoice Porcupine: the assistant opens when the user says the
// wake word. Detection runs entirely on the device (WebAssembly); the microphone audio never
// leaves it. It only listens while the app is open and visible, and it pauses while the assistant
// itself is using the microphone.
//
// Configuration (build time, see .env.example):
//   VITE_PICOVOICE_ACCESS_KEY  required: Picovoice console key
//   VITE_WAKEWORD_PPN          optional: public path of a custom keyword (e.g. /wakeword/oye-flow_es.ppn)
//   VITE_WAKEWORD_LABEL        optional: how the phrase is shown (default "Oye Flow" / "Jarvis")
//   VITE_WAKEWORD_LANG         optional: es | en, language of the custom keyword (default es)
// Without a custom keyword the built-in "Jarvis" keyword is used (English model).
const ACCESS_KEY = import.meta.env.VITE_PICOVOICE_ACCESS_KEY || ''
const CUSTOM_PPN = import.meta.env.VITE_WAKEWORD_PPN || ''
const CUSTOM_LANG = import.meta.env.VITE_WAKEWORD_LANG === 'en' ? 'en' : 'es'
const SENSITIVITY = 0.6
const PREF_KEY = 'wakeWordEnabled'

const label = import.meta.env.VITE_WAKEWORD_LABEL || (CUSTOM_PPN ? 'Oye Flow' : 'Jarvis')

export const useWakeWordStore = defineStore('wakeword', () => {
  const enabled = ref(false)
  const active = ref(false)
  const starting = ref(false)
  // denied | failed | key | null
  const error = ref(null)

  const supported = computed(() => Boolean(ACCESS_KEY) && typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia))
  const phrase = computed(() => label)

  let engine = null
  let voiceProcessor = null
  let onDetected = null

  try { enabled.value = localStorage.getItem(PREF_KEY) === '1' } catch { /* storage unavailable */ }

  const setHandler = (handler) => { onDetected = handler }

  const classify = (e) => {
    const text = String(e?.message || e)
    if (/permission|notallowed|denied/i.test(text)) return 'denied'
    if (/accesskey|activation|invalid key|key/i.test(text)) return 'key'
    return 'failed'
  }

  const stop = async () => {
    if (!engine) { active.value = false; return }
    const current = engine
    const processor = voiceProcessor
    engine = null
    voiceProcessor = null
    active.value = false
    try { await processor?.unsubscribe(current) } catch { /* already unsubscribed */ }
    try { await current.release() } catch { /* ignore */ }
    try { current.terminate() } catch { /* ignore */ }
  }

  const start = async () => {
    if (engine || starting.value || !supported.value) return
    starting.value = true
    error.value = null
    try {
      // The SDK is large (WebAssembly): loaded only when the feature is turned on.
      const [{ PorcupineWorker, BuiltInKeyword }, { WebVoiceProcessor }] = await Promise.all([
        import('@picovoice/porcupine-web'),
        import('@picovoice/web-voice-processor'),
      ])
      const keyword = CUSTOM_PPN
        ? { publicPath: CUSTOM_PPN, label, sensitivity: SENSITIVITY, forceWrite: false, version: 1 }
        : { builtin: BuiltInKeyword.Jarvis, sensitivity: SENSITIVITY }
      const model = { publicPath: CUSTOM_PPN && CUSTOM_LANG === 'es' ? '/wakeword/porcupine_params_es.pv' : '/wakeword/porcupine_params.pv', forceWrite: false, version: 1 }

      const worker = await PorcupineWorker.create(
        ACCESS_KEY,
        [keyword],
        async () => {
          // Release the microphone before the assistant asks for it.
          await stop()
          onDetected?.()
        },
        model,
        { processErrorCallback: () => { error.value = 'failed' } }
      )
      await WebVoiceProcessor.subscribe(worker)
      engine = worker
      voiceProcessor = WebVoiceProcessor
      active.value = true
    } catch (e) {
      error.value = classify(e)
      await stop()
      if (error.value === 'denied' || error.value === 'key') setEnabled(false)
    } finally {
      starting.value = false
    }
  }

  function setEnabled(value) {
    enabled.value = value
    try { localStorage.setItem(PREF_KEY, value ? '1' : '0') } catch { /* storage unavailable */ }
    if (!value) stop()
  }

  // Called whenever the conditions change: listen only when wanted AND allowed right now.
  const sync = (shouldListen) => (shouldListen && enabled.value ? start() : stop())

  return { enabled, active, starting, error, supported, phrase, setEnabled, setHandler, sync, start, stop }
})
