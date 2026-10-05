<template>
  <button
    type="button"
    class="orb"
    :class="[`orb--${state}`, { 'orb--kick': kick }]"
    :disabled="disabled"
    :aria-label="label"
    @click="emit('activate')"
  >
    <span class="orb__halo" aria-hidden="true"></span>
    <span class="orb__ring orb__ring--1" aria-hidden="true"></span>
    <span class="orb__ring orb__ring--2" aria-hidden="true"></span>
    <span class="orb__ring orb__ring--3" aria-hidden="true"></span>
    <span class="orb__spin" aria-hidden="true"></span>
    <span class="orb__core" aria-hidden="true">
      <span class="orb__shine"></span>
      <v-icon size="34" class="orb__icon">{{ icon }}</v-icon>
    </span>
  </button>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

// Animated voice orb. `state` drives the look (idle · listening · thinking · speaking · confirm);
// every change of `pulse` (new recognised words, a spoken word) gives the orb a short kick so it
// reacts to the conversation instead of looping blindly. Pure CSS: no canvas, no libraries.
const props = defineProps({
  state: { type: String, default: 'idle' },
  pulse: { type: Number, default: 0 },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['activate'])

const kick = ref(false)
let kickTimer = null
watch(() => props.pulse, () => {
  kick.value = true
  clearTimeout(kickTimer)
  kickTimer = setTimeout(() => { kick.value = false }, 160)
})

const icon = computed(() => ({
  listening: 'mdi-microphone',
  thinking: 'mdi-dots-horizontal',
  speaking: 'mdi-waveform',
  confirm: 'mdi-check',
}[props.state] || 'mdi-microphone-outline'))
</script>

<style scoped>
.orb {
  --orb-size: 132px;
  --orb-color: #22d3c5;
  --orb-color-2: #3fb6ff;
  position: relative;
  display: grid;
  place-items: center;
  width: var(--orb-size);
  height: var(--orb-size);
  margin: 0 auto;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: #04222b;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.orb:disabled { cursor: default; opacity: 0.5; }
.orb:focus-visible { outline: 2px solid var(--orb-color); outline-offset: 6px; }

/* Colour per state: the halo tells at a glance what the assistant is doing. */
.orb--listening { --orb-color: #22d3c5; --orb-color-2: #3fb6ff; }
.orb--thinking { --orb-color: #f4b860; --orb-color-2: #ffd98e; }
.orb--speaking { --orb-color: #3fb6ff; --orb-color-2: #22d3c5; }
.orb--confirm { --orb-color: #28d9a5; --orb-color-2: #7ff0cf; }
.orb--idle { --orb-color: #64e6dc; --orb-color-2: #3fb6ff; }

.orb__core {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 62%;
  height: 62%;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, #ffffff 0%, var(--orb-color-2) 34%, var(--orb-color) 72%);
  box-shadow: 0 0 34px color-mix(in srgb, var(--orb-color) 55%, transparent), inset 0 -6px 14px rgba(4, 34, 43, 0.28);
  transition: scale 160ms ease-out, box-shadow 300ms ease, background 400ms ease;
}
.orb__shine {
  position: absolute;
  top: 12%;
  left: 18%;
  width: 34%;
  height: 22%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  filter: blur(3px);
}
.orb__icon { position: relative; color: #04222b; }

.orb__halo {
  position: absolute;
  inset: -22%;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--orb-color) 38%, transparent) 0%, transparent 68%);
  opacity: 0.55;
  transition: opacity 400ms ease, background 400ms ease;
}

.orb__ring {
  position: absolute;
  inset: 19%;
  border: 2px solid var(--orb-color);
  border-radius: 50%;
  opacity: 0;
}

/* Idle: slow breathing. */
.orb--idle .orb__core { animation: orb-breathe 4.2s ease-in-out infinite; }
.orb--idle .orb__halo { opacity: 0.35; }

/* Listening and speaking: expanding rings. */
.orb--listening .orb__ring,
.orb--speaking .orb__ring { animation: orb-ring 2.4s ease-out infinite; }
.orb--speaking .orb__ring { animation-duration: 1.8s; }
.orb__ring--2 { animation-delay: 0.8s !important; }
.orb__ring--3 { animation-delay: 1.6s !important; }
.orb--listening .orb__core { animation: orb-breathe 1.8s ease-in-out infinite; }
.orb--speaking .orb__core { animation: orb-breathe 1.2s ease-in-out infinite; }

/* Thinking: a gold arc travels around the orb. */
.orb__spin {
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  opacity: 0;
  background: conic-gradient(from 0deg, transparent 0 60%, var(--orb-color) 100%);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
}
.orb--thinking .orb__spin { opacity: 1; animation: orb-spin 1.1s linear infinite; }
.orb--thinking .orb__core { animation: orb-breathe 2.6s ease-in-out infinite; }

/* Confirm: steady glow. */
.orb--confirm .orb__halo { opacity: 0.8; }

/* A new recognised word or spoken word gives the orb a quick kick. */
.orb--kick .orb__core { scale: 1.14; box-shadow: 0 0 52px color-mix(in srgb, var(--orb-color) 75%, transparent), inset 0 -6px 14px rgba(4, 34, 43, 0.28); }
.orb--kick .orb__halo { opacity: 0.95; }

@keyframes orb-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}
@keyframes orb-ring {
  0% { transform: scale(0.9); opacity: 0.55; }
  100% { transform: scale(1.75); opacity: 0; }
}
@keyframes orb-spin {
  to { transform: rotate(360deg); }
}

/* Reduced motion: no movement, the colour still shows the state. */
@media (prefers-reduced-motion: reduce) {
  .orb__core, .orb__ring, .orb__spin { animation: none !important; }
  .orb__ring { display: none; }
  .orb--thinking .orb__spin { opacity: 0.6; }
  .orb--kick .orb__core { scale: 1; }
}
</style>
