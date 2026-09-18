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
import { ref, onMounted } from 'vue'
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

    listening.value = true
    const result = await SpeechRecognition.start({ language: 'es-ES', maxResults: 1, popup: false })
    listening.value = false
    await parseAndEmit(result?.matches?.[0])
  } catch (e) {
    listening.value = false
    snackbar.error(e?.message || 'No se pudo iniciar el dictado por voz')
  }
}

const stopNative = async () => {
  const { SpeechRecognition } = await import('@capgo/capacitor-speech-recognition')
  await SpeechRecognition.stop().catch(() => {})
  listening.value = false
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
</script>
