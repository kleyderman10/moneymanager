<template>
  <div
    ref="root"
    class="kf-segmented"
    :class="{ 'kf-segmented--block': block, 'kf-segmented--more-start': moreStart, 'kf-segmented--more-end': moreEnd }"
    role="radiogroup"
    :aria-label="label"
    @scroll.passive="updateFades"
  >
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      role="radio"
      class="kf-segmented__option"
      :class="{ 'kf-segmented__option--active': option.value === modelValue }"
      :aria-checked="option.value === modelValue"
      :tabindex="option.value === modelValue || (!options.some(item => item.value === modelValue) && option === options[0]) ? 0 : -1"
      @keydown="onKeydown($event, option)"
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
// When the options do not fit (six admin tabs on a phone) the pill scrolls sideways and keeps
// the selected option in view; labels are never squeezed on top of each other.
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number, Boolean, null], default: null },
  options: { type: Array, required: true }, // [{ value, label, icon?, count? }]
  label: { type: String, default: undefined },
  block: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const root = ref(null)
const moreStart = ref(false)
const moreEnd = ref(false)
const updateFades = () => {
  const box = root.value
  if (!box) return
  moreStart.value = box.scrollLeft > 4
  moreEnd.value = box.scrollLeft + box.clientWidth < box.scrollWidth - 4
}
const revealActive = (behavior = 'smooth') => nextTick(() => {
  const box = root.value
  const active = box?.querySelector('.kf-segmented__option--active')
  if (!box || !active || box.scrollWidth <= box.clientWidth) return
  // Centers the option inside the pill only; the page itself must not scroll.
  box.scrollTo({ left: active.offsetLeft - (box.clientWidth - active.offsetWidth) / 2, behavior })
})
watch(() => props.modelValue, () => revealActive())
watch(() => props.options, () => nextTick(updateFades), { deep: true })
onMounted(() => {
  revealActive('auto')
  nextTick(updateFades)
  window.addEventListener('resize', updateFades)
})
onBeforeUnmount(() => window.removeEventListener('resize', updateFades))

function onKeydown(event, option) {
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
  if (!keys.includes(event.key) || !props.options.length) return
  event.preventDefault()
  const current = props.options.indexOf(option)
  const direction = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1
  const index = event.key === 'Home' ? 0 : event.key === 'End' ? props.options.length - 1
    : (current + direction + props.options.length) % props.options.length
  emit('update:modelValue', props.options[index].value)
  event.currentTarget.parentElement.querySelectorAll('[role="radio"]')[index]?.focus()
}
</script>

<style scoped>
.kf-segmented {
  position: relative;
  display: inline-flex;
  max-width: 100%;
  gap: 4px;
  padding: 4px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  border: 1px solid var(--kf-border-subtle);
  border-radius: var(--kf-radius-pill);
  background: rgba(4, 22, 31, 0.7);
  scrollbar-width: none;
}

.kf-segmented::-webkit-scrollbar {
  display: none;
}

/* Hints that there are more options beyond the visible edge. */
.kf-segmented--more-end {
  -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 36px), transparent);
  mask-image: linear-gradient(to right, #000 calc(100% - 36px), transparent);
}

.kf-segmented--more-start {
  -webkit-mask-image: linear-gradient(to left, #000 calc(100% - 36px), transparent);
  mask-image: linear-gradient(to left, #000 calc(100% - 36px), transparent);
}

.kf-segmented--more-start.kf-segmented--more-end {
  -webkit-mask-image: linear-gradient(to right, transparent, #000 36px, #000 calc(100% - 36px), transparent);
  mask-image: linear-gradient(to right, transparent, #000 36px, #000 calc(100% - 36px), transparent);
}

.kf-segmented--block {
  display: flex;
  width: 100%;
}

/* Options share the width when they fit and keep their own width when they do not. */
.kf-segmented--block .kf-segmented__option {
  flex: 1 0 auto;
  padding: 0 12px;
  font-size: 0.84rem;
}

.kf-segmented__option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
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
