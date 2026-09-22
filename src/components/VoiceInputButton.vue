<template>
  <button v-if="isSupported" type="button" class="tool-tile" :class="{ 'tool-tile--active': listening }" :disabled="processing" @click="toggle">
    <v-progress-circular v-if="processing" indeterminate size="20" width="2" color="primary" />
    <v-icon v-else size="22" :color="listening ? 'error' : 'primary'">{{ listening ? 'mdi-microphone-off' : 'mdi-microphone' }}</v-icon>
    <span class="tool-tile__label">{{ listening ? t('voiceInput.listening') : t('voiceInput.voice') }}</span>
  </button>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Capacitor } from '@capacitor/core'
import { aiAPI } from '@/api'
import { useSnackbar } from '@/stores/snackbar'

const { t, locale } = useI18n()
const speechLang = computed(() => locale.value === 'en' ? 'en-US' : 'es-ES')
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
    snackbar.error(t('voiceInput.couldNotInterpret'))
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
      snackbar.error(t('voiceInput.enableMicPermission'))
      return
    }

    lastTranscript = ''
    partialListener = await SpeechRecognition.addListener('partialResults', (event) => {
      if (event.matches?.[0]) lastTranscript = event.matches[0]
    })

    listening.value = true
    // Resolves right away when partialResults is true; it doesn't wait for the user to
    // finish speaking, so it's only used here to surface a startup error (e.g. mic busy).
    await SpeechRecognition.start({ language: speechLang.value, partialResults: true, popup: false })
  } catch (e) {
    listening.value = false
    await partialListener?.remove()
    partialListener = null
    snackbar.error(e?.message || t('voiceInput.couldNotStart'))
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
  recognition.lang = speechLang.value
  recognition.interimResults = false
  recognition.continuous = false

  recognition.onstart = () => { listening.value = true }
  recognition.onend = () => { listening.value = false }
  recognition.onresult = (event) => parseAndEmit(event.results[0][0].transcript)
  recognition.onerror = () => {
    listening.value = false
    snackbar.error(t('voiceInput.couldNotRecognize'))
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
