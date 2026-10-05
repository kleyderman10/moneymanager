// Text-to-speech helpers for the assistant: pick the most natural voice the device offers and
// prepare the text so it sounds like a person talking instead of reading a screen.

const PREFS_KEY = 'assistantVoicePrefs'

// Names that identify neural / high-quality voices on each platform, best first.
const QUALITY_HINTS = [
  [/natural|neural/i, 60], // Microsoft Edge "Online (Natural)"
  [/google/i, 40], // Chrome / Android
  [/premium|enhanced|siri/i, 45], // iOS / macOS
  [/online/i, 20],
]
const POOR_HINTS = [/espeak|compact|festival|mbrola/i]

// Closest regional accent first; the app's main audience is Colombian Spanish.
const REGION_ORDER = {
  es: ['es-CO', 'es-419', 'es-MX', 'es-US', 'es-AR', 'es-ES'],
  en: ['en-US', 'en-GB', 'en-AU'],
}

export const readPrefs = () => {
  try {
    return { rate: 1.03, voiceURI: null, ...(JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')) }
  } catch {
    return { rate: 1.03, voiceURI: null }
  }
}

export const savePrefs = (prefs) => {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)) } catch { /* storage unavailable */ }
}

export const voicesFor = (language) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
  return window.speechSynthesis.getVoices().filter((voice) => voice.lang?.toLowerCase().startsWith(language))
}

const scoreVoice = (voice, language) => {
  let score = 0
  for (const [pattern, points] of QUALITY_HINTS) if (pattern.test(voice.name)) score += points
  for (const pattern of POOR_HINTS) if (pattern.test(voice.name)) score -= 80
  const order = REGION_ORDER[language] || []
  const region = order.findIndex((code) => voice.lang?.replace('_', '-').toLowerCase() === code.toLowerCase())
  if (region >= 0) score += 30 - region * 4
  if (voice.localService === false) score += 5
  return score
}

// The voice the user picked, or the best-scoring one for the language.
export const pickVoice = (language, preferredURI = null) => {
  const candidates = voicesFor(language)
  if (!candidates.length) return null
  if (preferredURI) {
    const chosen = candidates.find((voice) => voice.voiceURI === preferredURI)
    if (chosen) return chosen
  }
  return [...candidates].sort((a, b) => scoreVoice(b, language) - scoreVoice(a, language))[0]
}

// Voices can load after the page does; resolves as soon as the list is available.
export const whenVoicesReady = () => new Promise((resolve) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return resolve([])
  const synth = window.speechSynthesis
  if (synth.getVoices().length) return resolve(synth.getVoices())
  const done = () => { synth.removeEventListener('voiceschanged', done); resolve(synth.getVoices()) }
  synth.addEventListener('voiceschanged', done)
  setTimeout(done, 1500)
})

// Reads better aloud: no bullets, symbols or emoji, amounts spoken with their currency name.
export const humanizeForSpeech = (text, language = 'es') => {
  const pesos = language === 'en' ? 'dollars' : 'pesos'
  return String(text || '')
    .replace(/[•▪◦●]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\$\s?(\d[\d.,]*\d|\d)/g, `$1 ${pesos}`)
    .replace(/\bCOP\b/g, pesos)
    .replace(/(\d)%/g, language === 'en' ? '$1 percent' : '$1 por ciento')
    .replace(/\s*·\s*/g, ', ')
    .replace(/([:;])\s*\n+/g, '$1 ')
    .replace(/\n+/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// Sentence by sentence so the voice breathes between ideas and can be interrupted cleanly.
export const splitSentences = (text) => String(text || '')
  .split(/(?<=[.!?])\s+/)
  .map((sentence) => sentence.trim())
  .filter(Boolean)
