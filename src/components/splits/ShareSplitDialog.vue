<template>
  <v-dialog :model-value="modelValue" max-width="420" @update:model-value="emit('update:modelValue', $event)">
    <v-card :title="t('splits.shareTitle', { name: participant?.name || '' })">
      <v-card-text class="text-center">
        <div v-if="loading" class="py-8"><v-progress-circular indeterminate color="primary" /></div>
        <template v-else-if="url">
          <img v-if="qr" :src="qr" :alt="t('splits.qrAlt')" class="split-qr" />
          <div class="text-h6 mt-2">{{ money(participant.amount, split.currency) }}</div>
          <div class="text-caption text-medium-emphasis mb-3">{{ t('splits.linkExpires', { date: date(expiresAt) }) }}</div>
          <div class="d-flex ga-2 justify-center flex-wrap">
            <v-btn color="primary" prepend-icon="mdi-share-variant" @click="share">{{ t('splits.share') }}</v-btn>
            <v-btn variant="tonal" prepend-icon="mdi-content-copy" @click="copy">{{ t('splits.copyLink') }}</v-btn>
          </div>
          <div class="text-caption text-medium-emphasis mt-3">{{ t('splits.shareHint') }}</div>
        </template>
      </v-card-text>
      <v-card-actions><v-spacer /><v-btn variant="text" @click="emit('update:modelValue', false)">{{ t('common.close') }}</v-btn></v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import QRCode from 'qrcode'
import { splitsAPI } from '@/api'
import { useSnackbar } from '@/stores/snackbar'
import { useLocale } from '@/composables/useLocale'
import { buildSplitUrl, shareLink } from '@/utils/shareLink'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  split: { type: Object, default: null },
  participant: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'linked'])

const { t } = useI18n()
const { money, date } = useLocale()
const snackbar = useSnackbar()
const loading = ref(false)
const url = ref('')
const qr = ref('')
const expiresAt = ref(null)

// El token solo se muestra al generarlo: cada vez que se abre el diálogo se crea uno nuevo.
watch(() => props.modelValue, async (open) => {
  if (!open || !props.split || !props.participant) return
  loading.value = true
  url.value = ''
  qr.value = ''
  try {
    const { data } = await splitsAPI.createLink(props.split.id, props.participant.id)
    url.value = buildSplitUrl(data.path)
    expiresAt.value = data.expiresAt
    qr.value = await QRCode.toDataURL(url.value, { margin: 1, width: 240 })
    emit('linked')
  } catch (error) {
    snackbar.error(error?.response?.data?.message || t('splits.linkError'))
    emit('update:modelValue', false)
  }
  loading.value = false
})

const share = async () => {
  try {
    const result = await shareLink({
      title: props.split.title,
      text: t('splits.shareText', { amount: money(props.participant.amount, props.split.currency), title: props.split.title }),
      url: url.value,
    })
    if (result === 'copied') snackbar.success(t('splits.linkCopied'))
  } catch {
    snackbar.error(t('splits.shareError'))
  }
}

const copy = async () => {
  try {
    await navigator.clipboard.writeText(url.value)
    snackbar.success(t('splits.linkCopied'))
  } catch {
    snackbar.error(t('splits.shareError'))
  }
}
</script>

<style scoped>
.split-qr { width: 220px; height: 220px; border-radius: 12px; background: #fff; padding: 8px; }
</style>
