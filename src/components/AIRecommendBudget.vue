<template>
  <v-btn
    size="small"
    variant="text"
    color="primary"
    :loading="loading"
    prepend-icon="mdi-calculator"
    @click="predict"
  >
    Recomendar monto
  </v-btn>
</template>

<script setup>
import { ref } from 'vue'
import { aiAPI } from '@/api'

const emit = defineEmits(['predicted'])
const props = defineProps({ categoryId: { type: String, default: null } })
const loading = ref(false)

const predict = async () => {
  loading.value = true
  try {
    const res = await aiAPI.predictBudget({ categoryId: props.categoryId || null })
    emit('predicted', res.data)
  } catch { /* ignore */ }
  loading.value = false
}
</script>
