<template>
  <button v-if="isSupported" type="button" class="tool-tile" :class="{ 'tool-tile--active': listening }" :disabled="processing" @click="toggle">
    <v-progress-circular v-if="processing" indeterminate size="20" width="2" color="primary" />
    <v-icon v-else size="22" :color="listening ? 'error' : 'primary'">{{ listening ? 'mdi-microphone-off' : 'mdi-microphone' }}</v-icon>
    <span class="tool-tile__label">{{ listening ? t('voiceInput.listening') : t('voiceInput.voice') }}</span>
  </button>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { aiAPI } from '@/api'
import { useSnackbar } from '@/stores/snackbar'
import { useSpeechRecognition } from '@/composables/useSpeechRecognition'

const { t } = useI18n()
const emit = defineEmits(['parsed'])
const snackbar = useSnackbar()
const processing = ref(false)

const parseAndEmit = async (text) => {
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

const { isSupported, listening, toggle } = useSpeechRecognition({
  onResult: parseAndEmit,
  onError: (key) => snackbar.error(key.startsWith('voiceInput.') ? t(key) : key),
})
</script>
