<template>
  <v-btn
    size="small"
    variant="text"
    color="primary"
    :loading="loading"
    prepend-icon="mdi-magic-staff"
    @click="suggest"
  >
    Sugerir categoría
  </v-btn>
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
