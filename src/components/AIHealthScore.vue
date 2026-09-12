<template>
  <v-card v-if="score" class="financial-health-card h-100 mb-0">
    <v-card-text class="d-flex align-center pa-5">
      <v-progress-circular
        :model-value="score.score"
        :color="scoreColor"
        size="72"
        width="7"
      >
        <span class="text-h6 font-weight-bold">{{ score.score }}</span>
      </v-progress-circular>
      <div class="ml-4">
        <div class="text-caption text-medium-emphasis">Índice financiero</div>
        <div class="text-body-1 font-weight-bold">Tu salud es {{ scoreLabel.toLowerCase() }}</div>
        <div class="text-caption text-medium-emphasis mt-1">Una lectura rápida de tus hábitos</div>
        <div v-if="score.breakdown" class="mt-2 d-flex flex-wrap ga-1">
          <v-chip v-for="(v, k) in score.breakdown" :key="k" size="x-small" variant="tonal">{{ labelFor(k) }} {{ v }}%</v-chip>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ score: { type: Object, default: null } })

const scoreColor = computed(() => {
  if (!props.score?.score) return 'grey'
  if (props.score.score >= 80) return 'success'
  if (props.score.score >= 50) return 'warning'
  return 'error'
})

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
