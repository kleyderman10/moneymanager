<template>
  <v-progress-circular :model-value="progress" :color="color" :size="size" :width="width">
    <span :class="valueClass">{{ displayValue }}</span>
  </v-progress-circular>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  size: { type: [Number, String], default: 96 },
  width: { type: [Number, String], default: 9 },
  // Thresholds are expressed as a percentage of `max`.
  low: { type: Number, default: 40 },
  mid: { type: Number, default: 70 },
  lowColor: { type: String, default: '#C1443A' },
  midColor: { type: String, default: '#E3A458' },
  highColor: { type: String, default: '#1F8A5C' },
  valueClass: { type: String, default: 'circular-gauge__value' },
})

const percent = computed(() => (props.max ? (Number(props.value) / props.max) * 100 : 0))
const progress = computed(() => Math.max(0, Math.min(100, percent.value)))
const displayValue = computed(() => Math.round(Number(props.value) || 0))
const color = computed(() => {
  if (percent.value >= props.mid) return props.highColor
  if (percent.value >= props.low) return props.midColor
  return props.lowColor
})
</script>

<style scoped>
.circular-gauge__value {
  color: var(--finance-ink, #102a33);
  font-weight: 700;
}
</style>
