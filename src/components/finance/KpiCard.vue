<template>
  <v-card class="kpi-card h-100" :class="`kpi-card--${tone}`">
    <v-card-text class="kpi-card__body">
      <span v-if="icon" class="kf-icon-tile" :class="toneTile"><v-icon size="20">{{ icon }}</v-icon></span>
      <div class="kpi-card__copy">
        <div class="kpi-card__label">{{ label }}</div>
        <div class="kpi-card__value kf-amount"><slot>{{ value }}</slot></div>
        <div v-if="hint || $slots.hint" class="kpi-card__hint"><slot name="hint">{{ hint }}</slot></div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

// Small metric card: icon tile + label + value. tone colors the icon and the value.
const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '' },
  icon: { type: String, default: '' },
  hint: { type: String, default: '' },
  tone: { type: String, default: 'neutral' }, // neutral | primary | income | expense | gold
})

const toneTile = computed(() => ({
  income: 'kf-icon-tile--income',
  expense: 'kf-icon-tile--expense',
  gold: 'kf-icon-tile--gold',
}[props.tone] || ''))
</script>

<style scoped>
.kpi-card__body {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px !important;
}

.kpi-card__copy {
  min-width: 0;
}

.kpi-card__label {
  color: var(--kf-text-secondary);
  font-size: 0.76rem;
  font-weight: 600;
}

.kpi-card__value {
  margin-top: 2px;
  color: var(--kf-text);
  font-size: 1.22rem;
  line-height: 1.2;
}

.kpi-card--income .kpi-card__value { color: var(--kf-income); }
.kpi-card--expense .kpi-card__value { color: var(--kf-expense); }
.kpi-card--primary .kpi-card__value { color: var(--kf-primary); }
.kpi-card--gold .kpi-card__value { color: var(--kf-gold-bright); }

.kpi-card__hint {
  margin-top: 2px;
  color: var(--kf-text-secondary);
  font-size: 0.72rem;
}

@media (max-width: 600px) {
  .kpi-card__body {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 14px !important;
  }

  .kpi-card__value {
    font-size: 1.08rem;
  }
}
</style>
