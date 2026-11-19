<template>
  <article class="ai-msg">
    <span class="ai-msg__avatar"><img :src="symbol" alt="" /></span>
    <div class="ai-msg__bubble">
      <span class="ai-msg__name">Flow</span>
      <AssistantCard v-for="(card, i) in blocks" :key="i" :card="card" class="ai-msg__card" />
      <!-- Sanitized by renderAiMarkdown (markdown-it html:false + DOMPurify) -->
      <div class="kf-ai-markdown" v-html="html" />
      <div v-if="actions" class="ai-msg__footer">
        <div class="ai-msg__actions">
          <button type="button" :aria-label="t('aiChat.copy')" :title="t('aiChat.copy')" @click="emit('copy')">
            <v-icon size="18">{{ copied ? 'mdi-check' : 'mdi-content-copy' }}</v-icon>
          </button>
          <button type="button" :aria-label="speaking ? t('aiChat.stopListening') : t('aiChat.listen')" :title="speaking ? t('aiChat.stopListening') : t('aiChat.listen')" :aria-pressed="speaking" @click="emit('listen')">
            <v-icon size="18">{{ speaking ? 'mdi-stop-circle-outline' : 'mdi-volume-high' }}</v-icon>
          </button>
          <button v-if="canRetry" type="button" :aria-label="t('aiChat.regenerate')" :title="t('aiChat.regenerate')" @click="emit('retry')">
            <v-icon size="18">mdi-refresh</v-icon>
          </button>
        </div>
        <time v-if="time" class="ai-msg__time">{{ time }}</time>
      </div>
      <time v-else-if="time" class="ai-msg__time">{{ time }}</time>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AssistantCard from '@/components/assistant/AssistantCard.vue'
import symbol from '@/assets/branding/knexura-flow-symbol.webp'
import { renderAiMarkdown } from '@/utils/aiMarkdown'

const props = defineProps({
  content: { type: String, default: '' },
  time: { type: String, default: '' },
  blocks: { type: Array, default: () => [] },
  // Acciones (copiar, escuchar, repetir): solo en respuestas ya terminadas.
  actions: { type: Boolean, default: false },
  canRetry: { type: Boolean, default: false },
  speaking: { type: Boolean, default: false },
  copied: { type: Boolean, default: false },
})
const emit = defineEmits(['copy', 'listen', 'retry'])
const { t } = useI18n()

const html = computed(() => renderAiMarkdown(props.content))
</script>

<style scoped>
.ai-msg {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 100%;
  color: var(--kf-text);
}
.ai-msg__avatar {
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(7, 32, 44, 0.95);
  border: 1px solid rgba(0, 229, 208, 0.35);
  box-shadow: 0 0 12px rgba(0, 229, 208, 0.18);
}
.ai-msg__avatar img { width: 24px; height: 24px; object-fit: contain; }
/* Bubble with its tail towards the avatar */
.ai-msg__bubble {
  min-width: 0;
  padding: 10px 14px 8px;
  background: rgba(14, 52, 66, 0.92);
  border: 1px solid rgba(50, 220, 210, 0.16);
  border-radius: 22px 22px 22px 6px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  overflow-wrap: anywhere;
}
.ai-msg__name { display: block; margin-bottom: 4px; font-weight: 700; font-size: 0.85rem; color: var(--kf-primary); }
.ai-msg__card { width: 100%; margin: 4px 0 8px; box-sizing: border-box; }
.ai-msg__footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 2px; }
.ai-msg__actions { display: flex; gap: 2px; margin-left: -8px; }
.ai-msg__actions button {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  color: var(--kf-text-secondary);
  background: none;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}
.ai-msg__actions button:hover,
.ai-msg__actions button[aria-pressed='true'] { color: var(--kf-primary); }
.ai-msg__actions button:focus-visible { outline: 2px solid var(--kf-primary); outline-offset: -2px; }
.ai-msg__time { display: block; margin-top: 4px; text-align: right; font-size: 0.75rem; color: var(--kf-text-secondary); }

.kf-ai-markdown { font-size: 0.95rem; line-height: 1.55; user-select: text; }
.kf-ai-markdown :deep(> :first-child) { margin-top: 0; }
.kf-ai-markdown :deep(> :last-child) { margin-bottom: 0; }
.kf-ai-markdown :deep(h1),
.kf-ai-markdown :deep(h2),
.kf-ai-markdown :deep(h3),
.kf-ai-markdown :deep(h4) {
  color: var(--kf-text);
  font-weight: 700;
  line-height: 1.3;
  margin: 16px 0 6px;
}
.kf-ai-markdown :deep(h1) { font-size: 1.15rem; }
.kf-ai-markdown :deep(h2) { font-size: 1.07rem; }
.kf-ai-markdown :deep(h3) { font-size: 1.06rem; }
.kf-ai-markdown :deep(h4) { font-size: 1rem; }
/* "### 1. Title" -> numbered badge */
.kf-ai-markdown :deep(h3[data-n]),
.kf-ai-markdown :deep(h2[data-n]) {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--kf-divider);
}
.kf-ai-markdown :deep([data-n]::before) {
  content: attr(data-n);
  flex: none;
  min-width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--kf-on-primary);
  background: var(--kf-primary-alt);
}
.kf-ai-markdown :deep(p) { margin: 8px 0; color: #dbe9ee; }
.kf-ai-markdown :deep(strong) { font-weight: 700; color: var(--kf-text); }
.kf-ai-markdown :deep(em) { color: var(--kf-text-secondary); }
.kf-ai-markdown :deep(ul),
.kf-ai-markdown :deep(ol) { margin: 8px 0; padding-left: 22px; }
.kf-ai-markdown :deep(li) { margin: 4px 0; }
.kf-ai-markdown :deep(li::marker) { color: var(--kf-primary-alt); }
.kf-ai-markdown :deep(a) { color: var(--kf-primary); text-decoration: underline; text-underline-offset: 2px; }
.kf-ai-markdown :deep(blockquote) {
  margin: 10px 0;
  padding: 6px 12px;
  border-left: 3px solid var(--kf-primary-alt);
  background: rgba(15, 59, 71, 0.5);
  border-radius: 0 12px 12px 0;
}
.kf-ai-markdown :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.87em;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.3);
  color: var(--kf-primary);
}
.kf-ai-markdown :deep(pre) {
  margin: 10px 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.35);
  overflow-x: auto;
}
.kf-ai-markdown :deep(pre code) { padding: 0; background: none; color: var(--kf-text); }
.kf-ai-markdown :deep(hr) { border: 0; border-top: 1px solid var(--kf-divider); margin: 14px 0; }

/* Recommendation / suggestion / tip callout */
.kf-ai-markdown :deep(p.kf-ai-tip) {
  position: relative;
  margin: 10px 0;
  padding: 12px 14px 12px 44px;
  background: rgba(92, 70, 20, 0.28);
  border: 1px solid rgba(244, 184, 96, 0.5);
  border-radius: 16px;
  color: var(--kf-text);
}
.kf-ai-markdown :deep(p.kf-ai-tip::before) {
  content: '\F0335'; /* mdi-lightbulb-outline */
  font-family: 'Material Design Icons';
  position: absolute;
  left: 14px;
  top: 10px;
  font-size: 20px;
  color: var(--kf-gold-bright);
}
.kf-ai-markdown :deep(p.kf-ai-tip > strong:first-child) { color: var(--kf-gold-bright); }
</style>
