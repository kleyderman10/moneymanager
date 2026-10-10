import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getWakeWordProvider } from '@/services/wakeword/WakeWordService'
import { WAKE_STATES } from '@/services/wakeword/WakeWordProvider'

// Hands-free activation: "Oye Flow" opens the assistant. Detection is local (openWakeWord models run
// on the device through ONNX Runtime) and the microphone audio never leaves it. The assistant
// session only starts after the phrase is detected.
//
// Configuration (build time, see .env.example):
//   VITE_WAKEWORD_MODEL  model file shipped in the app (default oye_flow.onnx)
//   VITE_WAKEWORD_LABEL  how the phrase is shown (default "Oye Flow")
const MODEL = import.meta.env.VITE_WAKEWORD_MODEL || 'oye_flow.onnx'
const LABEL = import.meta.env.VITE_WAKEWORD_LABEL || 'Oye Flow'
const COOLDOWN_MS = 2000

const PREF_ENABLED = 'wakeWordEnabled'
const PREF_SENSITIVITY = 'wakeWordSensitivity'

// Sensitivity shown to the user -> engine threshold. Higher sensitivity = lower threshold.
export const SENSITIVITY_THRESHOLDS = Object.freeze({ low: 0.8, normal: 0.6, high: 0.45 })

const readPref = (key, fallback) => {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}
const writePref = (key, value) => {
  try { localStorage.setItem(key, value) } catch { /* storage unavailable */ }
}

// Engine error code -> i18n key under assistant.wakeWord.errors
const USER_ERRORS = {
  MICROPHONE_PERMISSION_DENIED: 'denied',
  MICROPHONE_UNAVAILABLE: 'micBusy',
  MODEL_NOT_FOUND: 'model',
  MODEL_LOAD_ERROR: 'model',
}

export const useWakeWordStore = defineStore('wakeword', () => {
  const provider = getWakeWordProvider()

  const enabled = ref(false)
  const state = ref(WAKE_STATES.UNINITIALIZED)
  const initialized = ref(false)
  const starting = ref(false)
  const sensitivity = ref('normal')
  const error = ref(null)
  // null until checked; false hides the option (the model is not bundled in this build)
  const modelAvailable = ref(null)
  const lastDetection = ref(null)
  const detections = ref(0)
  const score = ref(0)
  const peak = ref(0)
  const threshold = computed(() => SENSITIVITY_THRESHOLDS[sensitivity.value] ?? SENSITIVITY_THRESHOLDS.normal)

  const supported = computed(() => provider.supported)
  const listening = computed(() => state.value === WAKE_STATES.LISTENING)
  const phrase = computed(() => LABEL)

  enabled.value = readPref(PREF_ENABLED, '0') === '1'
  const savedSensitivity = readPref(PREF_SENSITIVITY, 'normal')
  if (savedSensitivity in SENSITIVITY_THRESHOLDS) sensitivity.value = savedSensitivity

  let onDetected = null
  let wired = false
  // Retrying forever after a failure would drain the battery: one automatic attempt per failure.
  let blocked = false

  const checkModel = async () => {
    if (!supported.value) { modelAvailable.value = false; return false }
    modelAvailable.value = provider.isModelAvailable ? await provider.isModelAvailable(MODEL) : true
    if (!modelAvailable.value && enabled.value) setEnabled(false)
    return modelAvailable.value
  }

  const setHandler = (handler) => { onDetected = handler }

  const fail = (code, message) => {
    // Disabling clears the error, so it goes first.
    if (code === 'MICROPHONE_PERMISSION_DENIED') setEnabled(false)
    error.value = USER_ERRORS[code] || 'failed'
    blocked = true
    if (import.meta.env.DEV) console.warn('[WakeWord] error', code, message)
    // The engine is in ERROR: tear it down so the next attempt starts clean.
    if (initialized.value) {
      initialized.value = false
      provider.destroy().catch(() => {})
    }
  }

  const wire = () => {
    if (wired) return
    wired = true
    provider.onStateChange((next) => { state.value = next })
    provider.onError(({ code, message }) => fail(code, message))
    provider.onScore(({ score: s, peak: p }) => { score.value = s; peak.value = p })
    provider.onDetected((event) => {
      lastDetection.value = event
      detections.value += 1
      if (import.meta.env.DEV) console.info('[WakeWord] detected', event.phrase, event.score)
      // The engine has already released the microphone, so the assistant can take it.
      onDetected?.(event)
    })
  }

  const ensureInitialized = async () => {
    wire()
    if (initialized.value) return
    await provider.initialize({ model: MODEL, threshold: threshold.value, cooldownMs: COOLDOWN_MS })
    initialized.value = true
  }

  const start = async () => {
    if (starting.value || !supported.value || listening.value) return
    starting.value = true
    error.value = null
    try {
      await ensureInitialized()
      await provider.start()
      blocked = false
    } catch (e) {
      fail(e?.code, e?.message)
    } finally {
      starting.value = false
    }
  }

  const pause = async () => {
    if (!initialized.value) return
    try { await provider.pause() } catch { /* already paused */ }
  }

  const resume = async () => {
    if (!initialized.value || starting.value) return
    starting.value = true
    try {
      await provider.resume()
      blocked = false
    } catch (e) {
      fail(e?.code, e?.message)
    } finally {
      starting.value = false
    }
  }

  const stop = async () => {
    if (!initialized.value) return
    try { await provider.stop() } catch { /* nothing to stop */ }
  }

  function setEnabled(value) {
    enabled.value = Boolean(value)
    writePref(PREF_ENABLED, value ? '1' : '0')
    if (!value) {
      error.value = null
      stop()
    }
  }

  const setSensitivity = async (level) => {
    if (!(level in SENSITIVITY_THRESHOLDS)) return
    sensitivity.value = level
    writePref(PREF_SENSITIVITY, level)
    if (initialized.value) await provider.setThreshold(threshold.value).catch(() => {})
  }

  // Development: calibrate without changing the saved sensitivity.
  const setThreshold = (value) => provider.setThreshold(value)

  // Called whenever the conditions change.
  //  - listen:     the assistant is closed, the app is in the foreground and consent exists
  //  - foreground: false releases the microphone completely (first version: no background listening)
  const sync = (listen, foreground = true) => {
    if (!enabled.value || !supported.value || !foreground) return stop()
    if (!listen) return pause()
    if (blocked) return undefined
    return state.value === WAKE_STATES.PAUSED || state.value === WAKE_STATES.READY ? resume() : start()
  }

  const retry = () => { blocked = false; error.value = null }

  return {
    modelAvailable, checkModel, enabled, state, initialized, starting, error, sensitivity, threshold, lastDetection, detections, score, peak,
    supported, listening, phrase,
    setEnabled, setSensitivity, setThreshold, setHandler, sync, start, stop, pause, resume, retry,
  }
})
