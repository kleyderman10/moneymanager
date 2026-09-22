<template>
  <div>
    <button v-if="isSupported" type="button" class="tool-tile" :disabled="loading" @click="capture">
      <v-progress-circular v-if="loading" indeterminate size="20" width="2" color="primary" />
      <v-icon v-else size="22" color="primary">mdi-camera</v-icon>
      <span class="tool-tile__label">{{ t('receiptScanner.scanReceipt') }}</span>
    </button>
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
import { useI18n } from 'vue-i18n'
import { aiAPI } from '@/api'
import { readAndCompressImage } from '@/utils/imageUtils'

const { t } = useI18n()

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
