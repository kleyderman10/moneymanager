// Short interface sounds for the voice assistant, synthesised with the Web Audio API (no audio
// files to ship). They are quiet on purpose: a hint that the mic opened, closed, or that
// something was confirmed, not music.

const SOUNDS_KEY = 'assistantSounds'

// [frequency Hz, start s, duration s]
const CUES = {
  open: [[440, 0, 0.07], [660, 0.07, 0.1]],
  listen: [[660, 0, 0.08], [880, 0.08, 0.12]],
  stop: [[520, 0, 0.09]],
  confirm: [[784, 0, 0.09], [988, 0.09, 0.15]],
  done: [[523, 0, 0.09], [659, 0.09, 0.09], [784, 0.18, 0.2]],
  error: [[220, 0, 0.2]],
}
const VOLUME = 0.05

let audio = null

const context = () => {
  try {
    if (!audio) {
      const Ctor = window.AudioContext || window.webkitAudioContext
      if (!Ctor) return null
      audio = new Ctor()
    }
    if (audio.state === 'suspended') audio.resume().catch(() => {})
    return audio
  } catch {
    return null
  }
}

export const soundsEnabled = () => {
  try { return localStorage.getItem(SOUNDS_KEY) !== '0' } catch { return true }
}

export const setSoundsEnabled = (enabled) => {
  try { localStorage.setItem(SOUNDS_KEY, enabled ? '1' : '0') } catch { /* storage unavailable */ }
}

export const playCue = (name) => {
  if (!soundsEnabled() || !CUES[name]) return
  const ac = context()
  if (!ac) return
  const now = ac.currentTime
  for (const [frequency, start, duration] of CUES[name]) {
    const oscillator = ac.createOscillator()
    const gain = ac.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    // Soft attack and exponential release so it never clicks.
    gain.gain.setValueAtTime(0.0001, now + start)
    gain.gain.exponentialRampToValueAtTime(VOLUME, now + start + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration)
    oscillator.connect(gain).connect(ac.destination)
    oscillator.start(now + start)
    oscillator.stop(now + start + duration + 0.02)
  }
}
