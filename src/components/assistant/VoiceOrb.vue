<template>
  <button
    type="button"
    class="orb"
    :class="[`orb--${state}`, { 'orb--kick': kick }]"
    :disabled="disabled"
    :aria-label="label"
    @click="emit('activate')"
  >
    <span class="orb__wave orb__wave--left" aria-hidden="true">
      <i v-for="bar in bars" :key="bar.i" class="orb__bar" :style="bar.style"></i>
    </span>
    <span class="orb__wave orb__wave--right" aria-hidden="true">
      <i v-for="bar in bars" :key="bar.i" class="orb__bar" :style="bar.style"></i>
    </span>
    <span class="orb__halo" aria-hidden="true"></span>
    <span class="orb__spin" aria-hidden="true"></span>
    <span class="orb__core" aria-hidden="true">
      <v-icon size="40" class="orb__icon">{{ icon }}</v-icon>
    </span>
  </button>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

// Voice orb: a glowing ring with the microphone in the middle and sound bars on both sides.
// `state` drives the look (idle · listening · thinking · speaking · confirm): listening moves
// the bars gently, speaking moves them fully, thinking sends a gold wave outwards. Every change
// of `pulse` (recognised words, a spoken word) gives the ring a short kick. Pure CSS.
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

// Bars from the centre outwards: taller near the ring, uneven so it reads as sound, not a pattern.
const BAR_COUNT = 15
const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
  const envelope = 1 - (i / BAR_COUNT) * 0.8
  const jitter = 0.55 + 0.45 * Math.abs(Math.sin(i * 2.3 + 1))
  return {
    i,
    style: {
      '--peak': `${Math.round(10 + 46 * envelope * jitter)}px`,
      '--delay': `${((i * 137) % 700) / 1000}s`,
      '--step': `${i * 45}ms`,
      '--dur': `${0.7 + ((i * 53) % 50) / 100}s`,
    },
  }
})

const icon = computed(() => (props.state === 'confirm' ? 'mdi-check' : 'mdi-microphone'))
</script>

<style scoped>
.orb {
  --orb-color: #22d3c5;
  --orb-color-2: #3fb6ff;
  position: relative;
  display: grid;
  place-items: center;
  width: min(100%, 360px);
  height: 132px;
  margin: 0 auto;
  padding: 0;
  border: 0;
  background: none;
  color: var(--orb-color);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.orb:disabled { cursor: default; opacity: 0.5; }
.orb:focus-visible { outline: 2px solid var(--orb-color); outline-offset: 6px; border-radius: 16px; }

/* Colour per state: the glow tells at a glance what the assistant is doing. */
.orb--listening { --orb-color: #22d3c5; --orb-color-2: #3fb6ff; }
.orb--thinking { --orb-color: #f4b860; --orb-color-2: #ffd98e; }
.orb--speaking { --orb-color: #3fb6ff; --orb-color-2: #22d3c5; }
.orb--confirm { --orb-color: #28d9a5; --orb-color-2: #7ff0cf; }
.orb--idle { --orb-color: #64e6dc; --orb-color-2: #3fb6ff; }

/* Central ring with the microphone. */
.orb__core {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(4, 34, 43, 0.92) 55%, rgba(4, 34, 43, 0.6) 100%);
  border: 3px solid var(--orb-color);
  box-shadow:
    0 0 22px color-mix(in srgb, var(--orb-color) 70%, transparent),
    inset 0 0 18px color-mix(in srgb, var(--orb-color) 35%, transparent);
  transition: scale 160ms ease-out, box-shadow 300ms ease, border-color 400ms ease;
}
.orb__icon { color: var(--orb-color); filter: drop-shadow(0 0 8px color-mix(in srgb, var(--orb-color) 80%, transparent)); transition: color 400ms ease; }

.orb__halo {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 150px;
  height: 150px;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--orb-color) 30%, transparent) 0%, transparent 68%);
  opacity: 0.5;
  transition: opacity 400ms ease;
}

/* Sound bars, one group per side. Left is mirrored so the tallest bars sit next to the ring. */
.orb__wave {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  -webkit-mask-image: linear-gradient(to right, #000 55%, transparent);
  mask-image: linear-gradient(to right, #000 55%, transparent);
}
.orb__wave--right { left: calc(50% + 58px); right: 0; }
.orb__wave--left {
  right: calc(50% + 58px);
  left: 0;
  flex-direction: row-reverse;
  -webkit-mask-image: linear-gradient(to left, #000 55%, transparent);
  mask-image: linear-gradient(to left, #000 55%, transparent);
}
.orb__bar {
  flex: 0 0 3px;
  height: var(--peak);
  border-radius: 3px;
  background: linear-gradient(to bottom, var(--orb-color-2), var(--orb-color));
  box-shadow: 0 0 8px color-mix(in srgb, var(--orb-color) 60%, transparent);
  transform: scaleY(0.1);
  transition: background 400ms ease;
}

/* Idle: dotted line. Confirm: steady, calm bars. */
.orb--idle .orb__bar { transform: scaleY(0.1); opacity: 0.6; }
.orb--idle .orb__core { animation: orb-breathe 4.2s ease-in-out infinite; }
.orb--confirm .orb__bar { transform: scaleY(0.3); }
.orb--confirm .orb__halo { opacity: 0.8; }

/* Listening: soft, uneven movement. Speaking: wide and fast. */
.orb--listening .orb__bar { animation: orb-bar var(--dur) ease-in-out var(--delay) infinite alternate; --amp: 0.55; }
.orb--speaking .orb__bar { animation: orb-bar calc(var(--dur) * 0.6) ease-in-out var(--delay) infinite alternate; --amp: 1; }
.orb--listening .orb__core { animation: orb-breathe 1.8s ease-in-out infinite; }
.orb--speaking .orb__core { animation: orb-breathe 1.1s ease-in-out infinite; }
.orb--listening .orb__halo, .orb--speaking .orb__halo { opacity: 0.75; }

/* Thinking: a gold wave runs outwards from the ring while an arc turns around it. */
.orb--thinking .orb__bar { animation: orb-run 1.2s ease-in-out var(--step) infinite; }
.orb__spin {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 98px;
  height: 98px;
  translate: -50% -50%;
  border-radius: 50%;
  opacity: 0;
  background: conic-gradient(from 0deg, transparent 0 60%, var(--orb-color) 100%);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
}
.orb--thinking .orb__spin { opacity: 1; animation: orb-spin 1.1s linear infinite; }
.orb--thinking .orb__core { animation: orb-breathe 2.6s ease-in-out infinite; }

/* A recognised or spoken word gives the ring a quick kick. */
.orb--kick .orb__core { scale: 1.12; box-shadow: 0 0 40px color-mix(in srgb, var(--orb-color) 85%, transparent), inset 0 0 22px color-mix(in srgb, var(--orb-color) 45%, transparent); }
.orb--kick .orb__halo { opacity: 1; }

@keyframes orb-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
@keyframes orb-bar {
  0% { transform: scaleY(0.12); }
  100% { transform: scaleY(calc(0.25 + var(--amp) * 0.75)); }
}
@keyframes orb-run {
  0%, 100% { transform: scaleY(0.12); opacity: 0.5; }
  35% { transform: scaleY(0.7); opacity: 1; }
}
@keyframes orb-spin {
  to { transform: rotate(360deg); }
}

/* Reduced motion: no movement; the bars rest at a mid height so the state still reads. */
@media (prefers-reduced-motion: reduce) {
  .orb__core, .orb__bar, .orb__spin { animation: none !important; }
  .orb--listening .orb__bar, .orb--speaking .orb__bar, .orb--thinking .orb__bar { transform: scaleY(0.4); }
  .orb--thinking .orb__spin { opacity: 0.6; }
  .orb--kick .orb__core { scale: 1; }
}
</style>
