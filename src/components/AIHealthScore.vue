<template>
  <v-card v-if="score" class="financial-health-card h-100 mb-0">
    <v-card-text class="d-flex align-center flex-wrap pa-5">
      <CircularGauge :value="score.score" size="72" width="7" value-class="text-h6 font-weight-bold" />
      <div class="ml-4">
        <div class="text-caption text-medium-emphasis">Índice financiero</div>
        <div class="text-body-1 font-weight-bold">Tu salud es {{ scoreLabel.toLowerCase() }}</div>
        <div class="text-caption text-medium-emphasis mt-1">Una lectura rápida de tus hábitos</div>
      </div>
      <div v-if="score.breakdown" class="health-mini-stats">
        <div v-for="(v, k) in score.breakdown" :key="k" class="health-mini-stats__item">
          <span class="health-mini-stats__label">{{ labelFor(k) }}</span>
          <strong class="health-mini-stats__value">{{ v }}%</strong>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import CircularGauge from '@/components/CircularGauge.vue'

const props = defineProps({ score: { type: Object, default: null } })

const scoreLabel = computed(() => {
  if (!props.score?.score) return ''
  if (props.score.score >= 80) return 'Excelente'
  if (props.score.score >= 60) return 'Buena'
  if (props.score.score >= 40) return 'Regular'
  return 'Necesita atención'
})

const labelFor = (k) => {
  const m = { incomeExpenseRatio: 'Ingresos/Gastos', savingsRate: 'Ahorro', budgetAdherence: 'Presupuesto', emergencyFund: 'Emergencia' }
  return m[k] || k
}
</script>

<style scoped>
.health-mini-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 28px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--finance-line, #dce6e5);
  flex-basis: 100%;
}

.health-mini-stats__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 84px;
}

.health-mini-stats__label {
  color: var(--finance-muted, #6b7f83);
  font-size: 0.7rem;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.health-mini-stats__value {
  color: var(--finance-ink, #102a33);
  font-size: 1.05rem;
  font-weight: 700;
}
</style>
