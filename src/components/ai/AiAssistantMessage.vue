<template>
  <article class="ai-msg">
    <header class="ai-msg__head">
      <span class="ai-msg__avatar"><img :src="symbol" alt="" /></span>
      <span class="ai-msg__name">Knexura Flow</span>
      <time v-if="time" class="ai-msg__time">{{ time }}</time>
    </header>
    <!-- Sanitized by renderAiMarkdown (markdown-it html:false + DOMPurify) -->
    <div class="kf-ai-markdown" v-html="html" />
  </article>
</template>

<script setup>
import { computed } from 'vue'
import symbol from '@/assets/branding/knexura-flow-symbol.png'
import { renderAiMarkdown } from '@/utils/aiMarkdown'

const props = defineProps({
  content: { type: String, default: '' },
  time: { type: String, default: '' },
})

const html = computed(() => renderAiMarkdown(props.content))
</script>

<style scoped>
.ai-msg {
  max-width: 100%;
  padding: 14px 16px 16px;
  background: rgba(10, 45, 58, 0.86);
  border: 1px solid rgba(50, 220, 210, 0.14);
  border-radius: 22px;
  color: var(--kf-text);
  overflow-wrap: anywhere;
}
.ai-msg__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.ai-msg__avatar {
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(0, 229, 208, 0.1);
  border: 1px solid rgba(0, 229, 208, 0.25);
}
.ai-msg__avatar img { width: 20px; height: 20px; object-fit: contain; }
.ai-msg__name { font-weight: 700; font-size: 0.95rem; flex: 1; min-width: 0; }
.ai-msg__time { font-size: 0.75rem; color: var(--kf-text-secondary); }

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
