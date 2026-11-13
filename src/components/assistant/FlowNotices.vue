<template>
  <v-card v-if="items.length" class="flow-notices mb-3" data-tour="flow-notices">
    <v-card-title class="flow-notices__title">
      <v-icon size="20" color="primary">mdi-creation-outline</v-icon>
      {{ t('assistant.notices.title') }}
    </v-card-title>
    <ul class="flow-notices__list">
      <li v-for="item in shown" :key="item.id" class="flow-notices__item">
        <v-icon class="flow-notices__icon" :color="colorFor(item.severity)" :icon="iconFor(item.kind)" size="22" />
        <div class="flow-notices__body">
          <p class="flow-notices__text">{{ item.text }}</p>
          <div class="flow-notices__actions">
            <v-btn v-if="item.action" size="small" variant="tonal" color="primary" @click="open(item)">{{ t('assistant.notices.view') }}</v-btn>
            <v-btn size="small" variant="text" @click="assistant.dismissInsight(item.id)">{{ t('assistant.notices.dismiss') }}</v-btn>
          </div>
        </div>
      </li>
    </ul>
    <button v-if="items.length > 1" type="button" class="flow-notices__more" :aria-expanded="expanded" @click="expanded = !expanded">
      {{ expanded ? t('assistant.notices.less') : t('assistant.notices.more', { count: items.length - 1 }) }}
      <v-icon size="18">{{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
    </button>
  </v-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAssistantStore, ROUTE_PATHS } from '@/stores/assistant'

// Notices Flow raises on its own (card due, budget nearly spent, overdrawn account...).
// Dismissed ones stay hidden until the situation changes (the server issues a new id).
// Only the first one shows until the user asks for the rest, so the balance below stays on
// the first screen.
const MAX_VISIBLE = 3

const { t } = useI18n()
const router = useRouter()
const assistant = useAssistantStore()

const items = computed(() => assistant.visibleInsights.slice(0, MAX_VISIBLE))
const expanded = ref(false)
const shown = computed(() => (expanded.value ? items.value : items.value.slice(0, 1)))

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
.flow-notices__list { margin: 0; padding: 0 16px 4px; list-style: none; }
.flow-notices__item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; }
.flow-notices__item + .flow-notices__item { border-top: 1px solid var(--kf-border-subtle); }
.flow-notices__icon { flex: none; margin-top: 2px; }
.flow-notices__body { flex: 1; min-width: 0; }
.flow-notices__text { margin: 0; font-size: 0.95rem; line-height: 1.4; overflow-wrap: break-word; }
.flow-notices__actions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; margin-left: -4px; }
.flow-notices__more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  min-height: 44px;
  border: 0;
  border-top: 1px solid var(--kf-border-subtle);
  background: transparent;
  color: var(--kf-primary);
  font: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
}
.flow-notices__more:focus-visible { outline: 2px solid var(--kf-primary); outline-offset: -2px; }
</style>
