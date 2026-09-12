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
import { ref } from 'vue'
import { aiAPI } from '@/api'

const emit = defineEmits(['parsed'])
const listening = ref(false)
const processing = ref(false)
const isSupported = ref(typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window))

let recognition = null

const toggle = () => {
  if (listening.value) {
    stopListening()
    return
  }
  startListening()
}

const startListening = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  recognition = new SpeechRecognition()
  recognition.lang = 'es-ES'
  recognition.interimResults = false
  recognition.continuous = false

  recognition.onstart = () => { listening.value = true }
  recognition.onend = () => { listening.value = false }

  recognition.onresult = async (event) => {
    const text = event.results[0][0].transcript
    processing.value = true
    try {
      const res = await aiAPI.parseVoice(text)
      emit('parsed', res.data)
    } catch { /* ignore */ }
    processing.value = false
  }

  recognition.onerror = () => { listening.value = false }
  recognition.start()
}

const stopListening = () => {
  if (recognition) { recognition.stop(); recognition = null }
  listening.value = false
}
</script>
