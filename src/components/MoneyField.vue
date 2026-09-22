<template>
  <div class="money-field" :class="`money-field--${size}`">
    <label v-if="label" class="money-field__label">{{ label }}<span v-if="required" class="money-field__required">*</span></label>
    <div class="money-field__row">
      <span class="money-field__prefix">{{ displayPrefix }}</span>
      <input
        class="money-field__input"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        :placeholder="placeholder"
        :value="displayValue"
        @input="onInput"
      />
    </div>
    <div v-if="hint" class="money-field__hint">{{ hint }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useLocale } from '@/composables/useLocale'

const props = defineProps({
  modelValue: { type: Number, default: null },
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  placeholder: { type: String, default: '0' },
  prefix: { type: String, default: null },
  currency: { type: String, default: null },
  size: { type: String, default: 'compact' }, // 'hero' | 'compact'
  required: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const { currency: userCurrency, locale } = useLocale()
const activeCurrency = computed(() => props.currency || userCurrency.value)
const activeLocale = computed(() => locale.value)

// Deriva el símbolo ($ , S/, Bs., etc.) de la moneda activa en vez de asumir "$".
const currencySymbol = computed(() => {
  try {
    const parts = new Intl.NumberFormat(activeLocale.value, {
      style: 'currency',
      currency: activeCurrency.value,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    }).formatToParts(0)
    return parts.filter((p) => p.type === 'currency').map((p) => p.value).join('') || activeCurrency.value
  } catch {
    return activeCurrency.value
  }
})
const displayPrefix = computed(() => props.prefix ?? currencySymbol.value)

const displayValue = computed(() => (
  props.modelValue === null || props.modelValue === undefined || Number.isNaN(props.modelValue)
    ? ''
    : Number(props.modelValue).toLocaleString(activeLocale.value)
))

const onInput = (event) => {
  const digitsOnly = event.target.value.replace(/[^\d]/g, '')
  const value = digitsOnly === '' ? null : Number(digitsOnly)
  emit('update:modelValue', value)
  event.target.value = value === null ? '' : value.toLocaleString(activeLocale.value)
}
</script>

<style scoped>
.money-field {
  margin-bottom: 4px;
}

.money-field__label {
  display: block;
  margin-bottom: 6px;
  color: var(--finance-muted, #4C5E62);
  font-size: 0.76rem;
  font-weight: 650;
}

.money-field__required {
  margin-left: 2px;
  color: #C1443A;
}

.money-field__row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 6px 2px;
  border-bottom: 2px solid rgba(12, 38, 48, 0.85);
}

.money-field__prefix {
  color: var(--finance-muted, #4C5E62);
  font-weight: 700;
}

.money-field__input {
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--finance-ink, #102a33);
  font-weight: 780;
  font-family: inherit;
}

.money-field__input::placeholder {
  color: rgba(12, 38, 48, 0.28);
}

.money-field--hero .money-field__prefix {
  font-size: 1.6rem;
}

.money-field--hero .money-field__input {
  font-size: clamp(1.8rem, 6vw, 2.4rem);
}

.money-field--compact .money-field__prefix {
  font-size: 1.05rem;
}

.money-field--compact .money-field__input {
  font-size: 1.15rem;
}

.money-field__hint {
  margin-top: 6px;
  color: var(--finance-muted, #4C5E62);
  font-size: 0.72rem;
}
</style>
