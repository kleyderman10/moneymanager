import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { Capacitor } from '@capacitor/core'

// Speech-to-text shared by the transaction voice button and the global assistant.
//
// The Web Speech API (webkitSpeechRecognition) isn't available inside a Capacitor
// WKWebView on iOS — Apple only exposes it to the real Safari app. On native builds
// this must go through the device's own SFSpeechRecognizer via a Capacitor plugin
// instead; the web/PWA build keeps using the browser API.
//
// onResult(text) fires once per session with the final transcript; onError(i18nKey)
// with a key under `voiceInput.*` (or a raw message from the plugin).
//
// Listening always ends on its own: after `silenceMs` without new words once the user has said
// something, after `noSpeechMs` if nothing is heard at all, and after `maxMs` in any case.
// (iOS/Android never stop a session on silence, and the browser sometimes keeps it open.)
export function useSpeechRecognition({ onResult, onError, silenceMs = 2500, noSpeechMs = 8000, maxMs = 30000 } = {}) {
  const { locale } = useI18n()
  const speechLang = computed(() => locale.value === 'en' ? 'en-US' : 'es-ES')

  const isNative = Capacitor.isNativePlatform()
  const listening = ref(false)
  const transcript = ref('')
  const isSupported = ref(!isNative && typeof window !== 'undefined'
    && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window))

  // --- Auto-stop timers ---
  let silenceTimer = null
  let noSpeechTimer = null
  let maxTimer = null
  const clearTimers = () => {
    clearTimeout(silenceTimer)
    clearTimeout(noSpeechTimer)
    clearTimeout(maxTimer)
    silenceTimer = noSpeechTimer = maxTimer = null
  }
  // Called every time the transcript changes: the user is still talking.
  const heardSomething = () => {
    clearTimeout(noSpeechTimer)
    noSpeechTimer = null
    clearTimeout(silenceTimer)
    silenceTimer = setTimeout(() => { if (listening.value) stop() }, silenceMs)
  }
  const armTimers = () => {
    clearTimers()
    noSpeechTimer = setTimeout(() => {
      if (!listening.value || transcript.value) return
      cancel()
      onError?.('voiceInput.noSpeech')
    }, noSpeechMs)
    maxTimer = setTimeout(() => { if (listening.value) stop() }, maxMs)
  }

  const finish = (text) => {
    const value = (text || '').trim()
    if (value) onResult?.(value)
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

  const startNative = async () => {
    const { SpeechRecognition } = await import('@capgo/capacitor-speech-recognition')
    try {
      let permission = await SpeechRecognition.checkPermissions()
      if (permission.speechRecognition !== 'granted') {
        permission = await SpeechRecognition.requestPermissions()
      }
      if (permission.speechRecognition !== 'granted') {
        onError?.('voiceInput.enableMicPermission')
        return
      }

      transcript.value = ''
      partialListener = await SpeechRecognition.addListener('partialResults', (event) => {
        if (event.matches?.[0]) {
          transcript.value = event.matches[0]
          heardSomething()
        }
      })

      listening.value = true
      armTimers()
      // Resolves right away when partialResults is true; it doesn't wait for the user to
      // finish speaking, so it's only used here to surface a startup error (e.g. mic busy).
      await SpeechRecognition.start({ language: speechLang.value, partialResults: true, popup: false })
    } catch (e) {
      listening.value = false
      clearTimers()
      await partialListener?.remove()
      partialListener = null
      onError?.(e?.message || 'voiceInput.couldNotStart')
    }
  }

  const stopNative = async ({ discard = false } = {}) => {
    clearTimers()
    const { SpeechRecognition } = await import('@capgo/capacitor-speech-recognition')
    // forceStop (rather than stop) flushes the cached transcript through the partialResults
    // listener one last time before tearing the session down, so the tail end of what was
    // said isn't lost.
    await SpeechRecognition.forceStop().catch(() => {})
    listening.value = false
    await partialListener?.remove()
    partialListener = null
    if (!discard) finish(transcript.value)
  }

  // --- Web (browser / PWA) ---
  let recognition = null
  let discardWeb = false

  const startWeb = () => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    recognition = new SpeechRecognitionCtor()
    recognition.lang = speechLang.value
    recognition.interimResults = true
    recognition.continuous = false
    transcript.value = ''
    discardWeb = false

    recognition.onstart = () => { listening.value = true; armTimers() }
    recognition.onresult = (event) => {
      transcript.value = Array.from(event.results).map((r) => r[0].transcript).join(' ')
      heardSomething()
    }
    recognition.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return
      discardWeb = true
      onError?.(event.error === 'not-allowed' ? 'voiceInput.enableMicPermission' : 'voiceInput.couldNotRecognize')
    }
    recognition.onend = () => {
      clearTimers()
      listening.value = false
      recognition = null
      if (!discardWeb) finish(transcript.value)
    }
    recognition.start()
  }

  const stopWeb = ({ discard = false } = {}) => {
    clearTimers()
    discardWeb = discard
    if (recognition) recognition.stop()
    else listening.value = false
  }

  const start = () => (isNative ? startNative() : startWeb())
  // stop() ends the session and delivers the transcript; cancel() ends it silently.
  const stop = () => (isNative ? stopNative() : stopWeb())
  const cancel = () => (isNative ? stopNative({ discard: true }) : stopWeb({ discard: true }))
  const toggle = () => (listening.value ? stop() : start())

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

  onBeforeUnmount(() => {
    clearTimers()
    if (listening.value) cancel()
  })

  return { isSupported, listening, transcript, start, stop, cancel, toggle }
}
