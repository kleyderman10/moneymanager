<template>
  <form class="ai-composer" @submit.prevent="submit">
    <textarea
      ref="area"
      v-model="text"
      class="ai-composer__input"
      rows="1"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-label="placeholder"
      enterkeyhint="send"
      @input="grow"
      @keydown.enter.exact="onEnter"
    />
    <button
      v-if="micSupported && !canStop"
      type="button"
      class="ai-composer__mic"
      :class="{ 'ai-composer__mic--on': listening }"
      :disabled="disabled"
      :aria-label="listening ? micStopLabel : micLabel"
      :aria-pressed="listening"
      @click="toggleMic"
    >
      <v-icon size="24">{{ listening ? 'mdi-microphone-off' : 'mdi-microphone' }}</v-icon>
    </button>
    <button
      v-if="canStop"
      type="button"
      class="ai-composer__send ai-composer__send--stop"
      :aria-label="stopLabel"
      @click="emit('stop')"
    >
      <v-icon size="24">mdi-stop</v-icon>
    </button>
    <button
      v-else
      type="submit"
      class="ai-composer__send"
      :disabled="disabled || !text.trim()"
      :aria-label="sendLabel"
    >
      <v-icon size="24">mdi-send</v-icon>
    </button>
  </form>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useDisplay } from 'vuetify'
import { useSpeechRecognition } from '@/composables/useSpeechRecognition'
import { useSnackbar } from '@/stores/snackbar'
import { useI18n } from 'vue-i18n'

defineProps({
  disabled: { type: Boolean, default: false },
  placeholder: { type: String, default: '' },
  sendLabel: { type: String, default: '' },
  stopLabel: { type: String, default: '' },
  canStop: { type: Boolean, default: false },
  micLabel: { type: String, default: '' },
  micStopLabel: { type: String, default: '' },
})
const emit = defineEmits(['send', 'stop'])

const { mobile } = useDisplay()
const text = ref('')
const area = ref(null)

// Dictado: lo que se dice se añade al cuadro de texto para revisarlo antes de enviar.
const { t } = useI18n()
const snackbar = useSnackbar()
const { isSupported: micSupported, listening, start, stop } = useSpeechRecognition({
  onResult: async (spoken) => {
    text.value = `${text.value.trim()} ${spoken}`.trim()
    await nextTick()
    grow()
    area.value?.focus()
  },
  onError: (key) => {
    if (key === 'voiceInput.noSpeech') return
    snackbar.error(key.startsWith('voiceInput.') ? t(key) : key)
  },
})
const toggleMic = () => (listening.value ? stop() : start())

const grow = () => {
  const el = area.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 132)}px`
}

const submit = async () => {
  const value = text.value.trim()
  if (!value) return
  emit('send', value)
  text.value = ''
  await nextTick()
  grow()
}

// Desktop: Enter sends, Shift+Enter inserts a newline. Mobile: Enter inserts a newline.
const onEnter = (e) => {
  if (mobile.value || e.isComposing) return
  e.preventDefault()
  submit()
}
</script>

<style scoped>
.ai-composer {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin: 0 12px calc(10px + var(--safe-bottom, 0px));
  padding: 6px 6px 6px 8px;
  background: rgba(10, 42, 55, 0.96);
  border: 1px solid rgba(34, 211, 197, 0.28);
  border-radius: 30px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}
.ai-composer__input {
  flex: 1;
  min-width: 0;
  min-height: 48px;
  max-height: 132px;
  resize: none;
  padding: 13px 12px;
  font: inherit;
  font-size: 16px; /* avoids iOS zoom on focus */
  line-height: 22px;
  color: var(--kf-text);
  background: transparent;
  border: 0;
  outline: none;
}
.ai-composer__input::placeholder { color: var(--kf-text-secondary); }
.ai-composer:focus-within { border-color: var(--kf-primary); }
.ai-composer__send {
  flex: none;
  width: 48px;
  height: 48px;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: #052631;
  background: linear-gradient(135deg, #40e8dd, #00bdd0);
  transition: opacity var(--kf-motion), transform var(--kf-motion);
}
.ai-composer__mic {
  flex: none;
  width: 48px;
  height: 48px;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--kf-primary);
  background: transparent;
}
.ai-composer__mic:hover:not(:disabled) { background: rgba(34, 211, 197, 0.12); }
.ai-composer__mic:disabled { opacity: 0.4; cursor: default; }
.ai-composer__mic:focus-visible { outline: 2px solid var(--kf-primary); outline-offset: -2px; }
/* Escuchando: anillo que late, como el orbe del asistente de voz */
.ai-composer__mic--on { color: #052631; background: linear-gradient(135deg, #40e8dd, #00bdd0); animation: ai-mic-pulse 1.4s ease-out infinite; }
@keyframes ai-mic-pulse {
  0% { box-shadow: 0 0 0 0 rgba(64, 232, 221, 0.55); }
  100% { box-shadow: 0 0 0 14px rgba(64, 232, 221, 0); }
}
@media (prefers-reduced-motion: reduce) { .ai-composer__mic--on { animation: none; } }
.ai-composer__send--stop { color: var(--kf-text); background: rgba(255, 107, 107, 0.85); }
.ai-composer__send:active:not(:disabled) { transform: scale(0.95); }
.ai-composer__send:disabled { opacity: 0.4; cursor: default; }
</style>
