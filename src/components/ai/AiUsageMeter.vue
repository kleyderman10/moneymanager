<template>
  <div v-if="context || quota" class="ai-meter" role="status">
    <div v-if="context" class="ai-meter__row" :data-level="context.level">
      <span class="ai-meter__label">{{ t('aiChat.meterContext', { pct: context.pct }) }}</span>
      <span class="ai-meter__bar"><i :style="{ width: `${context.pct}%` }" /></span>
    </div>
    <div v-if="quota" class="ai-meter__row" :data-level="quota.level">
      <span class="ai-meter__label">{{ t(quota.period === 'month' ? 'aiChat.meterQuotaMonth' : 'aiChat.meterQuotaDay', { n: quota.remaining }) }}</span>
      <span class="ai-meter__bar"><i :style="{ width: `${quota.pct}%` }" /></span>
    </div>
    <p v-if="note" class="ai-meter__note" :data-level="note.level">{{ note.text }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({ usage: { type: Object, default: null } })
const { t } = useI18n()

const context = computed(() => props.usage?.context || null)
const quota = computed(() => props.usage?.quota || null)

// Un solo aviso a la vez: el más grave.
const note = computed(() => {
  const q = quota.value
  const c = context.value
  if (q?.level === 'critical') return { level: 'critical', text: t(q.remaining ? 'aiChat.noteQuotaLow' : 'aiChat.noteQuotaOut', { n: q.remaining }) }
  if (c?.level === 'critical') return { level: 'critical', text: t('aiChat.noteContextFull') }
  if (c?.level === 'warn' || c?.compacted) return { level: 'warn', text: t('aiChat.noteContextCompact') }
  if (q?.level === 'warn') return { level: 'warn', text: t('aiChat.noteQuotaLow', { n: q.remaining }) }
  return null
})
</script>

<style scoped>
.ai-meter { display: grid; gap: 6px; padding: 8px 16px 0; font-size: 0.72rem; color: var(--kf-text-secondary); }
.ai-meter__row { display: grid; grid-template-columns: minmax(0, 1fr) 72px; align-items: center; gap: 10px; }
.ai-meter__label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ai-meter__bar { height: 4px; border-radius: 999px; background: rgba(127, 127, 127, 0.25); overflow: hidden; }
.ai-meter__bar i { display: block; height: 100%; border-radius: inherit; background: var(--kf-success); transition: width var(--kf-motion, 0.2s), background-color var(--kf-motion, 0.2s); }
[data-level='warn'] .ai-meter__bar i { background: var(--kf-warning); }
[data-level='critical'] .ai-meter__bar i { background: var(--kf-danger); }
.ai-meter__note { margin: 0; line-height: 1.3; }
.ai-meter__note[data-level='warn'] { color: var(--kf-warning); }
.ai-meter__note[data-level='critical'] { color: var(--kf-danger); }
</style>
