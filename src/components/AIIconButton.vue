<template>
  <v-btn
    size="small"
    variant="outlined"
    color="primary"
    :loading="loading"
    prepend-icon="mdi-robot"
    @click="generate"
  >
    {{ t('aiIconButton.generateIcon') }}
  </v-btn>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { aiAPI } from '@/api'

const { t } = useI18n()

const emit = defineEmits(['generated'])
const props = defineProps({ name: String, type: String })
const loading = ref(false)

const generate = async () => {
  if (!props.name) return
  loading.value = true
  try {
    const res = await aiAPI.generateIcon({ name: props.name, type: props.type })
    emit('generated', res.data)
  } catch { /* ignore */}
  loading.value = false
}
</script>
