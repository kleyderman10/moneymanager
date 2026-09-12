<template>
  <v-card v-if="insights.length > 0" class="section-card mb-3">
    <v-card-title class="d-flex align-center">
      <span class="section-icon mr-3"><v-icon size="20">mdi-auto-awesome</v-icon></span>
      <div>
        <div class="text-body-1">Ideas para mejorar</div>
        <div class="text-caption text-medium-emphasis font-weight-regular">Recomendaciones creadas a partir de tus hábitos</div>
      </div>
      <v-spacer />
      <v-btn v-if="!billingStore.isReadOnly" size="small" variant="text" icon="mdi-refresh" title="Actualizar recomendaciones" :loading="loading" @click="store.refreshInsights" />
    </v-card-title>
    <v-list density="compact" bg-color="transparent">
      <v-list-item
        v-for="insight in insights.slice(0, 3)"
        :key="insight._id"
      >
        <template #prepend>
          <v-avatar size="36" :color="severityColor(insight.severity)" variant="tonal">
            <v-icon size="19">{{ severityIcon(insight.type) }}</v-icon>
          </v-avatar>
        </template>
        <v-list-item-title class="text-body-2">{{ insight.title }}</v-list-item-title>
        <v-list-item-subtitle class="text-caption">{{ insight.description }}</v-list-item-subtitle>
        <template #append>
          <v-btn v-if="!billingStore.isReadOnly" size="x-small" icon="mdi-close" variant="text" @click="store.dismissInsight(insight._id)" />
        </template>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useAiInsights } from '@/stores/aiInsights'
import { useSubscriptionStore } from '@/stores/subscriptions'

const store = useAiInsights()
const billingStore = useSubscriptionStore()
const props = defineProps({ loading: { type: Boolean, default: false } })
const insights = computed(() => store.insights)

const severityColor = (s) => s === 'high' ? 'error' : s === 'medium' ? 'warning' : 'info'
const severityIcon = (t) => {
  const m = { spending_pattern: 'mdi-chart-line', budget_alert: 'mdi-alert', saving_tip: 'mdi-piggy-bank', anomaly: 'mdi-alert-circle', general: 'mdi-information' }
  return m[t] || 'mdi-information'
}

onMounted(() => store.fetchInsights())
</script>
