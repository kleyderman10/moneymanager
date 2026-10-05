<template>
  <button
    type="button"
    class="kf-voice-btn"
    :class="[`kf-voice-btn--${variant}`, `kf-voice-btn--${status}`]"
    :aria-label="t('assistant.open')"
    :aria-describedby="`${variant}-voice-status`"
    :aria-busy="status === 'processing'"
    :title="variant === 'compact' ? `${t('assistant.open')} (Ctrl+Shift+Space)` : undefined"
    data-tour="nav-assistant"
    @click="$emit('voice-click')"
  >
    <span class="kf-voice-btn__orb">
      <span v-if="hasNotices" class="kf-voice-btn__dot" aria-hidden="true"></span>
      <v-progress-circular v-if="status === 'processing'" indeterminate size="22" width="2" color="on-primary" />
      <v-icon v-else :size="variant === 'nav' ? 28 : 20">{{ status === 'error' ? 'mdi-alert-circle-outline' : status === 'success' ? 'mdi-check' : 'mdi-microphone' }}</v-icon>
    </span>
    <span v-if="variant === 'nav'" class="kf-voice-btn__label">{{ t('assistant.speak') }}</span>
    <span :id="`${variant}-voice-status`" class="kf-voice-btn__status" role="status">{{ statusLabel }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAssistantStore } from '@/stores/assistant'

// Presentational trigger for the global assistant. It only emits voice-click; opening the
// assistant (and the AI-consent gate) stays in MainLayout's openAssistant().
defineProps({
  variant: { type: String, default: 'nav' }, // nav (bottom navigation) | compact (desktop top bar)
})
defineEmits(['voice-click'])

const { t } = useI18n()
const assistant = useAssistantStore()

// A dot on the button when Flow has something to tell the user.
const hasNotices = computed(() => assistant.visibleInsights.length > 0 && !assistant.visible)

const status = computed(() => {
  if (!assistant.visible) return 'idle'
  if (assistant.state === 'listening') return 'listening'
  if (assistant.state === 'thinking' || assistant.busy) return 'processing'
  if (assistant.state === 'error' || assistant.result?.type === 'error' || assistant.result?.error) return 'error'
  if (assistant.state === 'result' && assistant.result?.type !== 'confirm') return 'success'
  return 'idle'
})
const statusLabel = computed(() => status.value === 'idle' ? '' : t(`assistant.voice${status.value[0].toUpperCase()}${status.value.slice(1)}`))
</script>

<style scoped>
.kf-voice-btn__orb { position: relative; }
.kf-voice-btn__dot {
  position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; border-radius: 50%;
  background: #f4b860; border: 2px solid #071d29; box-shadow: 0 0 8px rgba(244, 184, 96, 0.8);
}
.kf-voice-btn {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  border: 0;
  background: transparent;
  color: var(--kf-on-primary);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.kf-voice-btn__orb {
  position: relative;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--kf-gradient-primary);
  box-shadow: var(--kf-glow);
  transition: transform var(--kf-motion) var(--kf-ease), box-shadow var(--kf-motion) var(--kf-ease);
}

.kf-voice-btn:active .kf-voice-btn__orb {
  transform: scale(0.94);
}

.kf-voice-btn:focus-visible {
  outline: none;
}

.kf-voice-btn:focus-visible .kf-voice-btn__orb {
  outline: 2px solid var(--kf-text);
  outline-offset: 3px;
}

/* Bottom navigation: raised circle above the bar with a label underneath. */
.kf-voice-btn--nav {
  transform: translateY(-14px);
}

.kf-voice-btn--nav .kf-voice-btn__orb {
  width: 62px;
  height: 62px;
  border: 4px solid var(--kf-bg-deep);
}

.kf-voice-btn__label {
  color: var(--kf-primary);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

/* Desktop top bar. */
.kf-voice-btn--compact .kf-voice-btn__orb {
  width: 44px;
  height: 44px;
  box-shadow: 0 4px 16px rgba(0, 229, 208, 0.28);
}

.kf-voice-btn--error .kf-voice-btn__orb { background: var(--kf-danger); }
.kf-voice-btn--success .kf-voice-btn__orb { background: var(--kf-success); }
.kf-voice-btn__status {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* Listening: a soft pulse only while the microphone is open. */
.kf-voice-btn--listening .kf-voice-btn__orb::after {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid var(--kf-primary);
  content: '';
  animation: kf-voice-pulse 1.4s var(--kf-ease) infinite;
}

@keyframes kf-voice-pulse {
  0% { opacity: 0.8; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.35); }
}

@media (prefers-reduced-motion: reduce) {
  .kf-voice-btn--listening .kf-voice-btn__orb::after {
    animation: none;
    opacity: 0.6;
  }
}
</style>
