<template>
  <v-card v-if="items.length" class="flow-notices mb-3" data-tour="flow-notices">
    <v-card-title class="flow-notices__title">
      <v-icon size="20" color="primary">mdi-creation-outline</v-icon>
      {{ t('assistant.notices.title') }}
    </v-card-title>
    <v-list bg-color="transparent" lines="two">
      <v-list-item v-for="item in items" :key="item.id" class="flow-notices__item">
        <template #prepend>
          <v-icon :color="colorFor(item.severity)" :icon="iconFor(item.kind)" />
        </template>
        <v-list-item-title class="text-wrap">{{ item.text }}</v-list-item-title>
        <template #append>
          <v-btn v-if="item.action" size="small" variant="tonal" @click="open(item)">{{ t('assistant.notices.view') }}</v-btn>
          <v-btn icon="mdi-close" size="small" variant="text" :aria-label="t('assistant.notices.dismiss')" @click="assistant.dismissInsight(item.id)" />
        </template>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAssistantStore, ROUTE_PATHS } from '@/stores/assistant'

// Notices Flow raises on its own (card due, budget nearly spent, overdrawn account...).
// Dismissed ones stay hidden until the situation changes (the server issues a new id).
const MAX_VISIBLE = 3

const { t } = useI18n()
const router = useRouter()
const assistant = useAssistantStore()

const items = computed(() => assistant.visibleInsights.slice(0, MAX_VISIBLE))

const ICONS = {
  card_due: 'mdi-credit-card-clock-outline',
  budget_over: 'mdi-chart-pie',
  budget_near: 'mdi-chart-pie',
  recurring_due: 'mdi-autorenew',
  overdrawn: 'mdi-alert-circle-outline',
  spending_spike: 'mdi-trending-up',
}
const iconFor = (kind) => ICONS[kind] || 'mdi-bell-outline'
const colorFor = (severity) => ({ high: 'error', medium: 'warning', low: 'info' }[severity] || 'primary')

const open = (item) => {
  const path = ROUTE_PATHS[item.action?.route]
  if (path) router.push(path)
}

onMounted(() => assistant.fetchInsights())
</script>

<style scoped>
.flow-notices { border: 1px solid rgba(34, 211, 197, 0.22); background: rgba(9, 53, 65, 0.55) !important; }
.flow-notices__title { display: flex; align-items: center; gap: 8px; font-size: 1rem; }
.flow-notices__item { gap: 8px; }
</style>
