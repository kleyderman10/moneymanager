<template>
  <label
    class="native-select-field"
    :class="{
      'native-select-field--disabled': disabled,
      'native-select-field--error': error,
    }"
  >
    <span class="native-select-field__label">{{ label }}</span>
    <select
      class="native-select-field__control"
      :value="normalizedValue"
      :disabled="disabled || loading"
      :required="required"
      :aria-label="label"
      @change="onChange"
    >
      <option v-if="placeholder" value="" :disabled="required">{{ placeholder }}</option>
      <option v-if="loading" value="" disabled>{{ loadingText }}</option>
      <option v-else-if="items.length === 0" value="" disabled>{{ noDataText }}</option>
      <option
        v-for="(item, index) in items"
        :key="String(getValue(item) ?? index)"
        :value="getValue(item)"
      >
        {{ getTitle(item) }}
      </option>
    </select>
    <v-progress-circular
      v-if="loading"
      class="native-select-field__icon"
      indeterminate
      size="18"
      width="2"
    />
    <v-icon v-else class="native-select-field__icon" size="20">mdi-menu-down</v-icon>
  </label>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: null },
  items: { type: Array, default: () => [] },
  itemTitle: { type: String, default: 'title' },
  itemValue: { type: String, default: 'value' },
  label: { type: String, required: true },
  placeholder: { type: String, default: '' },
  loading: Boolean,
  disabled: Boolean,
  required: Boolean,
  error: Boolean,
  loadingText: { type: String, default: 'Cargando...' },
  noDataText: { type: String, default: 'No hay opciones disponibles' },
})

const emit = defineEmits(['update:modelValue'])

const normalizedValue = computed(() => props.modelValue ?? '')
const getTitle = (item) => typeof item === 'object' ? item?.[props.itemTitle] : item
const getValue = (item) => typeof item === 'object' ? item?.[props.itemValue] : item

const onChange = (event) => {
  const raw = event.target.value
  if (raw === '') {
    emit('update:modelValue', null)
    return
  }
  const match = props.items.find((item) => String(getValue(item)) === raw)
  emit('update:modelValue', match ? getValue(match) : raw)
}
</script>

<style scoped>
.native-select-field {
  position: relative;
  display: block;
  margin-bottom: 22px;
  color: rgb(var(--v-theme-on-surface));
}

.native-select-field__label {
  position: absolute;
  z-index: 1;
  top: 5px;
  left: 16px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.75rem;
  line-height: 1;
  pointer-events: none;
}

.native-select-field__control {
  width: 100%;
  height: 40px;
  padding: 14px 44px 2px 16px;
  border: 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.42);
  border-radius: 12px 12px 0 0;
  outline: 0;
  background: rgba(var(--v-theme-on-surface), 0.04);
  color: inherit;
  font: inherit;
  appearance: none;
  cursor: pointer;
}

.native-select-field:focus-within .native-select-field__control {
  border-bottom: 2px solid rgb(var(--v-theme-primary));
}

.native-select-field:focus-within .native-select-field__label {
  color: rgb(var(--v-theme-primary));
}

.native-select-field__icon {
  position: absolute;
  top: 10px;
  right: 14px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  pointer-events: none;
}

.native-select-field--disabled {
  opacity: 0.55;
}

.native-select-field--disabled .native-select-field__control {
  cursor: default;
}

.native-select-field--error .native-select-field__control {
  border-bottom-color: rgb(var(--v-theme-error));
}
</style>
