<template>
  <div class="kf-segmented" :class="{ 'kf-segmented--block': block }" role="radiogroup" :aria-label="label">
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      role="radio"
      class="kf-segmented__option"
      :class="{ 'kf-segmented__option--active': option.value === modelValue }"
      :aria-checked="option.value === modelValue"
      @click="option.value !== modelValue && $emit('update:modelValue', option.value)"
    >
      <v-icon v-if="option.icon" size="18" class="mr-1">{{ option.icon }}</v-icon>
      <span>{{ option.label }}</span>
      <span v-if="option.count !== undefined" class="kf-segmented__count">{{ option.count }}</span>
    </button>
  </div>
</template>

<script setup>
// Pill-style segmented control (Todos · Ingresos · Gastos, etc.) shared across screens.
defineProps({
  modelValue: { type: [String, Number, Boolean, null], default: null },
  options: { type: Array, required: true }, // [{ value, label, icon?, count? }]
  label: { type: String, default: undefined },
  block: { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.kf-segmented {
  display: inline-flex;
  max-width: 100%;
  gap: 4px;
  padding: 4px;
  overflow-x: auto;
  border: 1px solid var(--kf-border-subtle);
  border-radius: var(--kf-radius-pill);
  background: rgba(4, 22, 31, 0.7);
  scrollbar-width: none;
}

.kf-segmented::-webkit-scrollbar {
  display: none;
}

.kf-segmented--block {
  display: flex;
  width: 100%;
}

.kf-segmented--block .kf-segmented__option {
  flex: 1 1 0;
  min-width: 0;
  padding: 0 8px;
  font-size: 0.84rem;
}

.kf-segmented__option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--kf-radius-pill);
  background: transparent;
  color: var(--kf-text-secondary);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background var(--kf-motion) var(--kf-ease), color var(--kf-motion) var(--kf-ease);
}

.kf-segmented__option:hover {
  color: var(--kf-text);
}

.kf-segmented__option--active {
  background: var(--kf-gradient-primary);
  box-shadow: 0 4px 16px rgba(0, 229, 208, 0.25);
  color: var(--kf-on-primary);
}

.kf-segmented__option--active:hover {
  color: var(--kf-on-primary);
}

.kf-segmented__count {
  display: inline-grid;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  place-items: center;
  border-radius: var(--kf-radius-pill);
  background: rgba(255, 255, 255, 0.1);
  font-size: 0.74rem;
}

.kf-segmented__option--active .kf-segmented__count {
  background: rgba(4, 34, 43, 0.18);
}

.kf-segmented__option:focus-visible {
  outline: 2px solid var(--kf-primary);
  outline-offset: 1px;
}
</style>
