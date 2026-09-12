<template>
  <div>
    <v-btn
      v-if="isSupported"
      size="small"
      variant="text"
      color="primary"
      :loading="loading"
      prepend-icon="mdi-camera"
      @click="capture"
    >
      Escanear recibo
    </v-btn>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      capture="environment"
      style="display: none"
      @change="handleFile"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { aiAPI } from '@/api'
import { readAndCompressImage } from '@/utils/imageUtils'

const emit = defineEmits(['scanned'])
const loading = ref(false)
const fileInput = ref(null)
const isSupported = ref(typeof window !== 'undefined' && 'FileReader' in window)

const capture = () => {
  fileInput.value?.click()
}

const handleFile = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  loading.value = true
  try {
    const base64 = await readAndCompressImage(file)
    const res = await aiAPI.scanReceipt(base64)
    emit('scanned', res.data)
  } catch { /* ignore */ }
  loading.value = false
  event.target.value = ''
}
</script>
