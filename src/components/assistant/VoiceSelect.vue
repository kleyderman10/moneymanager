<template>
  <div ref="root" class="vs">
    <button
      ref="trigger"
      type="button"
      class="vs-trigger"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="toggle"
      @keydown.down.prevent="openMenu"
    >
      <span class="vs-label">{{ label }}</span>
      <span class="vs-value">{{ selectedTitle }}</span>
      <v-progress-circular v-if="loading" class="vs-chev" indeterminate size="18" width="2" />
      <v-icon v-else class="vs-chev" size="24">{{ open ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
    </button>

    <div v-if="open" class="vs-pop" :style="popStyle" role="presentation">
      <input
        ref="search"
        v-model="query"
        class="vs-search"
        type="text"
        autocomplete="off"
        :placeholder="searchPlaceholder"
        :aria-label="label"
        @keydown.esc.stop.prevent="close"
        @keydown.enter.prevent="selectFirst"
      />
      <ul class="vs-list" role="listbox" :aria-label="label">
        <li
          v-for="item in filtered"
          :key="String(item.value)"
          class="vs-option"
          :class="{ 'is-selected': item.value === modelValue }"
          role="option"
          :aria-selected="item.value === modelValue"
          @click="select(item)"
        >
          <span>{{ item.title }}</span>
          <v-icon v-if="item.value === modelValue" size="20">mdi-check</v-icon>
        </li>
        <li v-if="!filtered.length" class="vs-empty">{{ noDataText }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { default: null },
  items: { type: Array, default: () => [] }, // [{ title, value }]
  label: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  noDataText: { type: String, default: '' },
  searchPlaceholder: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const root = ref(null)
const trigger = ref(null)
const search = ref(null)
const open = ref(false)
const query = ref('')
const popStyle = ref({})

const selectedTitle = computed(() => props.items.find((i) => i.value === props.modelValue)?.title ?? '')

const norm = (v) => String(v ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const filtered = computed(() => {
  const q = norm(query.value.trim())
  return q ? props.items.filter((i) => norm(i.title).includes(q)) : props.items
})

const place = () => {
  const r = trigger.value.getBoundingClientRect()
  const below = window.innerHeight - r.bottom - 12
  const above = r.top - 12
  const down = below >= 240 || below >= above
  const maxHeight = Math.max(160, Math.min(340, down ? below : above))
  popStyle.value = {
    left: `${r.left}px`,
    width: `${r.width}px`,
    maxHeight: `${maxHeight}px`,
    ...(down ? { top: `${r.bottom + 6}px` } : { bottom: `${window.innerHeight - r.top + 6}px` }),
  }
}

const onOutside = (e) => { if (!root.value?.contains(e.target)) close() }
const onScroll = (e) => { if (!root.value?.contains(e.target)) close() }

const openMenu = async () => {
  if (open.value) return
  query.value = ''
  place()
  open.value = true
  document.addEventListener('pointerdown', onOutside, true)
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', close)
  await nextTick()
  search.value?.focus({ preventScroll: true })
}
const close = () => {
  if (!open.value) return
  open.value = false
  document.removeEventListener('pointerdown', onOutside, true)
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', close)
  trigger.value?.focus({ preventScroll: true })
}
const toggle = () => (open.value ? close() : openMenu())
const select = (item) => {
  emit('update:modelValue', item.value)
  close()
}
const selectFirst = () => { if (filtered.value.length) select(filtered.value[0]) }

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onOutside, true)
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', close)
})
</script>

<style scoped>
.vs { position: relative; width: 100%; min-width: 0; }
.vs-trigger {
  position: relative; width: 100%; min-height: 64px; display: flex; flex-direction: column; justify-content: center;
  padding: 0 40px 0 0; text-align: left; font: inherit; color: var(--kf-text); background: transparent; border: 0; cursor: pointer;
}
.vs-label { font-size: 0.8125rem; color: var(--kf-text-secondary); }
.vs-value { min-height: 1.9rem; font-size: 1.375rem; font-weight: 600; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vs-chev { position: absolute; right: 0; top: 50%; transform: translateY(-50%); color: var(--kf-text-secondary); }
.vs-trigger:focus-visible { outline: 2px solid var(--kf-primary); outline-offset: 6px; border-radius: 8px; }

.vs-pop {
  position: fixed; z-index: 3000; display: flex; flex-direction: column; overflow: hidden;
  background: #0d3340; border: 1px solid rgba(34, 211, 197, 0.3); border-radius: 16px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
}
.vs-search {
  flex: none; min-height: 48px; padding: 0 16px; font: inherit; font-size: 16px; color: var(--kf-text);
  background: rgba(7, 32, 44, 0.8); border: 0; border-bottom: 1px solid rgba(34, 211, 197, 0.18); outline: none;
}
.vs-search::placeholder { color: var(--kf-text-secondary); }
.vs-list { flex: 1; min-height: 0; margin: 0; padding: 6px; list-style: none; overflow-y: auto; overscroll-behavior: contain; }
.vs-option {
  min-height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 14px;
  font-size: 1rem; color: var(--kf-text); border-radius: 12px; cursor: pointer;
}
.vs-option:hover { background: rgba(34, 211, 197, 0.12); }
.vs-option.is-selected { color: var(--kf-primary); font-weight: 700; }
.vs-empty { padding: 16px; text-align: center; color: var(--kf-text-secondary); }
</style>
