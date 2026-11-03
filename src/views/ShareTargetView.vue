<template>
  <div class="text-center pa-8">
    <v-progress-circular indeterminate color="primary" />
    <div class="mt-3 text-body-2">{{ t('pending.receiving') }}</div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePendingStore } from '@/stores/pending'
import { useSnackbar } from '@/stores/snackbar'

// Destino de "Compartir → Knexura Flow" (Web Share Target): el texto compartido, normalmente un
// SMS o aviso del banco, entra a la bandeja "Por confirmar". No registra nada por sí solo.
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = usePendingStore()
const snackbar = useSnackbar()

onMounted(async () => {
  const text = [route.query.text, route.query.title].filter((v) => typeof v === 'string' && v.trim()).join(' ').slice(0, 1000)
  if (text.length >= 3) {
    try {
      const { duplicate } = await store.addFromText(text, 'share')
      snackbar[duplicate ? 'info' : 'success'](t(duplicate ? 'pending.alreadyAdded' : 'pending.added'))
    } catch (error) {
      snackbar.error(error?.response?.status === 422 ? t('transactions.pasteNotRecognized') : t('pending.error'))
    }
  }
  router.replace('/pending')
})
</script>
