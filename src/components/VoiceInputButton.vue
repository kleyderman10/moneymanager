<template>
  <v-btn
    v-if="isSupported"
    size="small"
    variant="text"
    :color="listening ? 'error' : 'primary'"
    :loading="processing"
    :prepend-icon="listening ? 'mdi-microphone-off' : 'mdi-microphone'"
    @click="toggle"
  >
    {{ listening ? 'Escuchando...' : 'Voz' }}
  </v-btn>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Capacitor } from '@capacitor/core'
import { aiAPI } from '@/api'
import { useSnackbar } from '@/stores/snackbar'

const emit = defineEmits(['parsed'])
const snackbar = useSnackbar()

// The Web Speech API (webkitSpeechRecognition) isn't available inside a Capacitor
// WKWebView on iOS — Apple only exposes it to the real Safari app. On native builds
// this must go through the device's own SFSpeechRecognizer via a Capacitor plugin
// instead; the web/PWA build keeps using the browser API.
const isNative = Capacitor.isNativePlatform()
const listening = ref(false)
const processing = ref(false)
const isSupported = ref(!isNative && typeof window !== 'undefined'
  && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window))

let recognition = null

const parseAndEmit = async (text) => {
  if (!text) return
  processing.value = true
  try {
    const res = await aiAPI.parseVoice(text)
    emit('parsed', res.data)
  } catch {
    snackbar.error('No se pudo interpretar lo que dijiste. Intenta de nuevo.')
  } finally {
    processing.value = false
  }
}

// --- Native (iOS/Android), via @capgo/capacitor-speech-recognition ---
// iOS never auto-stops the session on silence (unlike the browser's SpeechRecognition),
// so recognition stays open until the user taps to stop it. Awaiting start()'s own
// promise for a "final" result only works when the recognizer itself ends the session —
// a manual stop() instead rejects that promise with "Recognition stopped before final
// results were produced". So instead: enable partialResults, track the transcript as it
// streams in through the listener, and on manual stop just use whatever was captured so
// far rather than waiting on a final result that a user-initiated stop will never produce.
let partialListener = null
let lastTranscript = ''

const startNative = async () => {
  const { SpeechRecognition } = await import('@capgo/capacitor-speech-recognition')
  try {
    let permission = await SpeechRecognition.checkPermissions()
    if (permission.speechRecognition !== 'granted') {
      permission = await SpeechRecognition.requestPermissions()
    }
    if (permission.speechRecognition !== 'granted') {
      snackbar.error('Activa el permiso de micrófono/dictado en Ajustes para usar esta función.')
      return
    }

    lastTranscript = ''
    partialListener = await SpeechRecognition.addListener('partialResults', (event) => {
      if (event.matches?.[0]) lastTranscript = event.matches[0]
    })

    listening.value = true
    // Resolves right away when partialResults is true; it doesn't wait for the user to
    // finish speaking, so it's only used here to surface a startup error (e.g. mic busy).
    await SpeechRecognition.start({ language: 'es-ES', partialResults: true, popup: false })
  } catch (e) {
    listening.value = false
    await partialListener?.remove()
    partialListener = null
    snackbar.error(e?.message || 'No se pudo iniciar el dictado por voz')
  }
}

const stopNative = async () => {
  const { SpeechRecognition } = await import('@capgo/capacitor-speech-recognition')
  // forceStop (rather than stop) flushes the cached transcript through the partialResults
  // listener one last time before tearing the session down, so the tail end of what was
  // said isn't lost.
  await SpeechRecognition.forceStop().catch(() => {})
  listening.value = false
  await partialListener?.remove()
  partialListener = null
  await parseAndEmit(lastTranscript)
}

// --- Web (browser / PWA) ---
const startWeb = () => {
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
  recognition = new SpeechRecognitionCtor()
  recognition.lang = 'es-ES'
  recognition.interimResults = false
  recognition.continuous = false

  recognition.onstart = () => { listening.value = true }
  recognition.onend = () => { listening.value = false }
  recognition.onresult = (event) => parseAndEmit(event.results[0][0].transcript)
  recognition.onerror = () => {
    listening.value = false
    snackbar.error('No se pudo reconocer el audio. Intenta de nuevo.')
  }
  recognition.start()
}

const stopWeb = () => {
  if (recognition) { recognition.stop(); recognition = null }
  listening.value = false
}

const toggle = () => {
  if (listening.value) {
    isNative ? stopNative() : stopWeb()
    return
  }
  isNative ? startNative() : startWeb()
}

onMounted(async () => {
  if (!isNative) return
  try {
    const { SpeechRecognition } = await import('@capgo/capacitor-speech-recognition')
    const { available } = await SpeechRecognition.available()
    isSupported.value = available
  } catch {
    isSupported.value = false
  }
})

onBeforeUnmount(async () => {
  if (!isNative || !listening.value) return
  const { SpeechRecognition } = await import('@capgo/capacitor-speech-recognition')
  await SpeechRecognition.forceStop().catch(() => {})
  await partialListener?.remove()
  partialListener = null
})
</script>
