// Leer en voz alta una respuesta del chat: TTS nativo en la app, speechSynthesis en la web.
import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { TextToSpeech } from '@capacitor-community/text-to-speech'
import { readPrefs, pickVoice, whenVoicesReady, humanizeForSpeech, splitSentences } from '@/utils/voice'

// Qué mensaje se está leyendo (clave elegida por quien llama) para alternar el botón.
export const speakingKey = ref(null)
let token = 0

export const stopSpeaking = () => {
  token += 1
  speakingKey.value = null
  if (Capacitor.isNativePlatform()) TextToSpeech.stop().catch(() => {})
  else if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
}

export const speakText = async (text, language, key) => {
  stopSpeaking()
  const sentences = splitSentences(humanizeForSpeech(text, language))
  if (!sentences.length) return
  const mine = token
  const prefs = readPrefs()
  speakingKey.value = key
  try {
    if (Capacitor.isNativePlatform()) {
      const lang = language === 'en' ? 'en-US' : 'es-CO'
      for (const sentence of sentences) {
        if (mine !== token) return
        await TextToSpeech.speak({ text: sentence, lang, rate: prefs.rate, volume: 1, category: 'playback', queueStrategy: 1 }).catch(() => {})
      }
      return
    }
    if (!('speechSynthesis' in window)) return
    await whenVoicesReady()
    const voice = pickVoice(language, prefs.voiceURI)
    for (const sentence of sentences) {
      if (mine !== token) return
      await new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(sentence)
        if (voice) utterance.voice = voice
        utterance.lang = voice?.lang || (language === 'en' ? 'en-US' : 'es-CO')
        utterance.rate = prefs.rate
        utterance.onend = resolve
        utterance.onerror = resolve
        window.speechSynthesis.speak(utterance)
      })
    }
  } finally {
    if (mine === token) speakingKey.value = null
  }
}
