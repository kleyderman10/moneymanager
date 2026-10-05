<template>
  <v-dialog :model-value="modelValue" max-width="420" @update:model-value="emit('update:modelValue', $event)">
    <v-card :title="title || t('wallets.confirm')">
      <v-card-text>{{ message }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">{{ t('common.cancel') }}</v-btn>
        <v-btn color="error" :loading="loading" @click="emit('confirm')">{{ confirmLabel || t('common.delete') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'confirm'])
const { t } = useI18n()
</script>
