<template>
  <button type="button" class="tool-tile" :disabled="loading" @click="suggest">
    <v-progress-circular v-if="loading" indeterminate size="20" width="2" color="primary" />
    <v-icon v-else size="22" color="primary">mdi-magic-staff</v-icon>
    <span class="tool-tile__label">Sugerir categoría</span>
  </button>
</template>

<script setup>
import { ref } from 'vue'
import { aiAPI } from '@/api'

const emit = defineEmits(['suggested'])
const props = defineProps({ description: String, amount: Number, type: { type: String, default: 'expense' } })
const loading = ref(false)

const suggest = async () => {
  if (!props.description) return
  loading.value = true
  try {
    const res = await aiAPI.suggestCategory({ description: props.description, amount: props.amount, type: props.type })
    emit('suggested', res.data)
  } catch { /* ignore */ }
  loading.value = false
}
</script>
