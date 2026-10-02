<template>
  <v-card class="dashboard-hero">
    <v-card-text class="pa-6 pa-md-7">
      <div class="d-flex align-center justify-space-between ga-3">
        <div class="dashboard-hero__label">{{ label }}</div>
        <v-btn :icon="visible ? 'mdi-eye-outline' : 'mdi-eye-off-outline'" variant="text" :aria-label="visible ? t('dashboard.hideBalance') : t('dashboard.showBalance')" :aria-pressed="!visible" @click="visible = !visible" />
      </div>
      <div class="dashboard-hero__amount">{{ visible ? money(amount) : '••••••' }}</div>
      <div v-if="visible"><slot /></div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocale } from '@/composables/useLocale'
defineProps({ label: { type: String, required: true }, amount: { type: Number, default: 0 } })
const { t } = useI18n()
const { money } = useLocale()
const visible = ref(true)
</script>
