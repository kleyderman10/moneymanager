<template>
  <form class="ai-composer" @submit.prevent="submit">
    <textarea
      ref="area"
      v-model="text"
      class="ai-composer__input"
      rows="1"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-label="placeholder"
      enterkeyhint="send"
      @input="grow"
      @keydown.enter.exact="onEnter"
    />
    <button
      type="submit"
      class="ai-composer__send"
      :disabled="disabled || !text.trim()"
      :aria-label="sendLabel"
    >
      <v-icon size="24">mdi-send</v-icon>
    </button>
  </form>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useDisplay } from 'vuetify'

defineProps({
  disabled: { type: Boolean, default: false },
  placeholder: { type: String, default: '' },
  sendLabel: { type: String, default: '' },
})
const emit = defineEmits(['send'])

const { mobile } = useDisplay()
const text = ref('')
const area = ref(null)

const grow = () => {
  const el = area.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 132)}px`
}

const submit = async () => {
  const value = text.value.trim()
  if (!value) return
  emit('send', value)
  text.value = ''
  await nextTick()
  grow()
}

// Desktop: Enter sends, Shift+Enter inserts a newline. Mobile: Enter inserts a newline.
const onEnter = (e) => {
  if (mobile.value || e.isComposing) return
  e.preventDefault()
  submit()
}
</script>

<style scoped>
.ai-composer {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 12px 14px calc(12px + var(--safe-bottom, 0px));
  background: rgba(7, 32, 44, 0.96);
  border-top: 1px solid rgba(34, 211, 197, 0.12);
}
.ai-composer__input {
  flex: 1;
  min-width: 0;
  min-height: 48px;
  max-height: 132px;
  resize: none;
  padding: 13px 18px;
  font: inherit;
  font-size: 16px; /* avoids iOS zoom on focus */
  line-height: 22px;
  color: var(--kf-text);
  background: rgba(20, 60, 73, 0.68);
  border: 1px solid rgba(34, 211, 197, 0.18);
  border-radius: 24px;
  outline: none;
  transition: border-color var(--kf-motion) var(--kf-ease);
}
.ai-composer__input::placeholder { color: var(--kf-text-secondary); }
.ai-composer__input:focus { border-color: var(--kf-primary); }
.ai-composer__send {
  flex: none;
  width: 52px;
  height: 52px;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: #052631;
  background: linear-gradient(135deg, #40e8dd, #00bdd0);
  transition: opacity var(--kf-motion), transform var(--kf-motion);
}
.ai-composer__send:active:not(:disabled) { transform: scale(0.95); }
.ai-composer__send:disabled { opacity: 0.4; cursor: default; }
</style>
