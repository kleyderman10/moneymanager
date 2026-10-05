<template>
  <v-dialog
    :model-value="assistant.visible"
    :fullscreen="isMobile"
    :max-width="isMobile ? undefined : 1080"
    :width="isMobile ? undefined : 'min(94vw, 1080px)'"
    transition="dialog-transition"
    scrim="#02121a"
    content-class="vf-dialog"
    @update:model-value="(v) => (v ? assistant.open() : onClose())"
  >
    <section class="vf">
      <header class="vf-head">
        <span class="vf-mic" :class="{ 'vf-mic--active': listening }"><v-icon size="30">mdi-microphone</v-icon></span>
        <div class="vf-head__text">
          <h2>{{ t('assistant.open') }}</h2>
          <p>{{ listening ? t('assistant.listening') : t('assistant.subtitle') }}</p>
        </div>
        <button type="button" class="vf-close" :aria-label="t('assistant.close')" @click="onClose">
          <v-icon size="24">mdi-close</v-icon>
        </button>
      </header>

      <div class="vf-body">
        <!-- Conversation so far -->
        <div v-if="assistant.thread.length" ref="threadEl" class="vf-thread" aria-live="polite">
          <div v-for="(message, index) in assistant.thread" :key="index" class="vf-msg" :class="`vf-msg--${message.role}`">{{ message.content }}</div>
        </div>

        <!-- Quick answers to the assistant's open question -->
        <div v-if="assistant.question?.options?.length && assistant.state !== 'thinking'" class="vf-chips vf-chips--question">
          <button v-for="option in assistant.question.options" :key="option.value" type="button" class="vf-chip" @click="send(option.label)">
            {{ option.label }}
          </button>
        </div>

        <!-- Listening / idle -->
        <div v-if="['idle', 'listening'].includes(assistant.state)" class="vf-listen">
          <button
            type="button"
            class="assistant-mic"
            :class="{ 'assistant-mic--active': listening }"
            :disabled="!isSupported"
            :aria-label="listening ? t('assistant.listening') : t('assistant.tapToSpeak')"
            @click="toggleMic"
          >
            <v-icon size="36">{{ listening ? 'mdi-stop' : 'mdi-microphone' }}</v-icon>
          </button>
          <div class="vf-listen__text">
            {{ liveTranscript || (listening ? t('assistant.listening') : (isSupported ? t('assistant.tapToSpeak') : t('assistant.notSupported'))) }}
          </div>
          <div v-if="!listening && !liveTranscript" class="vf-examples">
            <div class="vf-examples__title">{{ t('assistant.examplesTitle') }}</div>
            <div class="vf-chips">
              <button v-for="key in ['example1', 'example2', 'example3']" :key="key" type="button" class="vf-chip" @click="send(t(`assistant.${key}`))">
                {{ t(`assistant.${key}`) }}
              </button>
            </div>
          </div>
        </div>

        <!-- Thinking -->
        <div v-else-if="assistant.state === 'thinking'" class="vf-thinking" role="status">
          <v-progress-circular indeterminate size="22" width="3" color="primary" />
          <span>{{ t('assistant.analyzing') }}</span>
        </div>

        <!-- Result -->
        <div v-else-if="result">
          <template v-if="result.type === 'confirm'">
            <div class="vf-title">
              <h3>{{ result.intent === 'create_registers' ? t('assistant.willRegister') : result.summary?.split('\n')[0] }}</h3>
              <span class="vf-hint"><v-icon size="18">mdi-lightbulb-outline</v-icon>{{ t('assistant.canEdit') }}</span>
            </div>

            <template v-if="result.intent === 'create_registers'">
              <div v-for="(item, index) in draft" :key="index" class="vf-card">
                <div class="vf-card__top">
                  <div class="vf-seg" role="group" :aria-label="t('assistant.type')">
                    <button type="button" class="vf-seg__btn" :class="{ 'is-on': item.type === 'expense' }" :aria-pressed="item.type === 'expense'" @click="item.type = 'expense'">
                      <v-icon size="24">mdi-cart-outline</v-icon>{{ t('assistant.expense') }}
                    </button>
                    <button type="button" class="vf-seg__btn" :class="{ 'is-on': item.type === 'income' }" :aria-pressed="item.type === 'income'" @click="item.type = 'income'">
                      <v-icon size="24">mdi-arrow-top-right</v-icon>{{ t('assistant.income') }}
                    </button>
                  </div>
                  <v-btn v-if="draft.length > 1" icon="mdi-close" variant="text" :aria-label="t('assistant.removeItem')" @click="draft.splice(index, 1)" />
                </div>

                <div class="vf-grid">
                  <div class="vf-field vf-field--amount">
                    <v-text-field v-model.number="item.amount" type="number" min="0" inputmode="decimal" :label="t('assistant.amount')" variant="plain" hide-details />
                  </div>
                  <div class="vf-field vf-field--date">
                    <v-text-field v-model="item.date" type="date" :label="t('assistant.date')" variant="plain" hide-details append-inner-icon="mdi-calendar-blank-outline" />
                  </div>
                  <div class="vf-field">
                    <VoiceSelect v-model="item.category" :items="categoryOptions(item)" :label="t('assistant.category')" :loading="categoriesStore.loading" :no-data-text="t('assistant.noResults')" :search-placeholder="t('assistant.search')" />
                  </div>
                  <div class="vf-field">
                    <VoiceSelect v-model="item.wallet" :items="walletOptions" :label="t('assistant.wallet')" :loading="walletsStore.loading" :no-data-text="t('assistant.noResults')" :search-placeholder="t('assistant.search')" />
                  </div>
                  <div class="vf-field vf-field--wide">
                    <v-text-field v-model="item.description" :label="t('assistant.description')" variant="plain" hide-details />
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="vf-card assistant-reply">{{ result.summary }}</div>

            <v-alert v-if="result.error" type="error" variant="tonal" density="compact" class="mt-3">{{ result.error }}</v-alert>
          </template>

          <div v-else-if="result.type === 'error'" class="vf-card assistant-reply text-error">
            {{ result.reply || t('assistant.error') }}
          </div>
        </div>

        <!-- Typed fallback -->
        <div v-if="result?.type !== 'confirm' && assistant.state !== 'thinking'" class="vf-type">
          <v-text-field
            v-model="typed"
            :placeholder="t('assistant.typePlaceholder')"
            density="comfortable"
            variant="outlined"
            hide-details
            append-inner-icon="mdi-send"
            @click:append-inner="send(typed)"
            @keydown.enter.prevent="send(typed)"
          />
        </div>
      </div>

      <footer class="vf-actions">
        <div v-if="result?.type === 'confirm'" class="vf-actions__row">
          <button type="button" class="vf-btn vf-btn--ghost" :disabled="assistant.busy" @click="assistant.cancel()">{{ t('assistant.cancel') }}</button>
          <button type="button" class="vf-btn vf-btn--primary" :disabled="assistant.busy" @click="onConfirm">
            <v-progress-circular v-if="assistant.busy" indeterminate size="20" width="2" />
            <span v-else>{{ t('assistant.confirm') }}</span>
          </button>
        </div>
        <div v-else-if="result?.type === 'done'" class="vf-actions__row">
          <button type="button" class="vf-btn vf-btn--ghost" @click="onUndo"><v-icon size="22">mdi-undo</v-icon>{{ t('assistant.undo') }}</button>
          <button type="button" class="vf-btn vf-btn--ghost" @click="another"><v-icon size="22">mdi-microphone</v-icon>{{ t('assistant.anythingElse') }}</button>
          <button type="button" class="vf-btn vf-btn--primary" @click="onClose">{{ t('assistant.close') }}</button>
        </div>
        <button v-else-if="['result', 'error'].includes(assistant.state)" type="button" class="vf-btn vf-btn--ghost vf-btn--full" @click="restart">
          <v-icon size="22">mdi-microphone</v-icon>{{ t('assistant.tryAgain') }}
        </button>
        <div v-if="!isMobile" class="vf-shortcut">{{ t('assistant.shortcut') }}</div>
      </footer>
    </section>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import { Capacitor } from '@capacitor/core'
import { useAssistantStore, ROUTE_PATHS } from '@/stores/assistant'
import { useCategoriesStore } from '@/stores/categories'
import { useWalletsStore } from '@/stores/wallets'
import { useSnackbar } from '@/stores/snackbar'
import VoiceSelect from '@/components/assistant/VoiceSelect.vue'
import { useSpeechRecognition } from '@/composables/useSpeechRecognition'

const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const assistant = useAssistantStore()
const categoriesStore = useCategoriesStore()
const walletsStore = useWalletsStore()
const snackbar = useSnackbar()

const typed = ref('')
const pendingQuestion = ref('')
const threadEl = ref(null)
const draft = ref([])
const viaVoice = ref(false)
const result = computed(() => assistant.result)

const { isSupported, listening, transcript: liveTranscript, start, stop, cancel: cancelMic } = useSpeechRecognition({
  onResult: (text) => { viaVoice.value = true; pendingQuestion.value = ''; interpret(text) },
  onError: (key) => {
    assistant.state = 'idle'
    snackbar.error(key.startsWith('voiceInput.') ? t(key) : key)
  },
})

const interpret = async (text) => {
  const data = await assistant.interpret(text, route.name ? String(route.name).toLowerCase() : null)
  if (!data) return
  if (data.type === 'navigate' && ROUTE_PATHS[data.route]) {
    router.push(ROUTE_PATHS[data.route])
    assistant.close()
    return
  }
  if (viaVoice.value && ['answer', 'clarify'].includes(data.type)) await speak(data.reply)
  // The assistant asked a question: keep it on screen and open the mic for the answer.
  if (viaVoice.value && data.type === 'clarify' && assistant.visible && isSupported.value) {
    pendingQuestion.value = data.reply
    assistant.state = 'listening'
    start()
  }
}

const send = (text) => {
  if (!text?.trim() || assistant.state === 'thinking') return
  if (listening.value) cancelMic()
  viaVoice.value = false
  typed.value = ''
  pendingQuestion.value = ''
  interpret(text)
}

const toggleMic = () => {
  if (listening.value) { stop(); return }
  assistant.state = 'listening'
  start()
}

// After a saved action the conversation stays open for the next one.
const another = () => {
  assistant.reset()
  toggleMic()
}

const restart = () => {
  assistant.reset()
  toggleMic()
}

// Spoken replies only on the web build (speechSynthesis); the native app shows text.
const speak = (text) => new Promise((resolve) => {
  if (!text || Capacitor.isNativePlatform() || !('speechSynthesis' in window)) return resolve()
  const utterance = new SpeechSynthesisUtterance(text.replace(/•/g, ''))
  utterance.lang = locale.value === 'en' ? 'en-US' : 'es-ES'
  utterance.onend = resolve
  utterance.onerror = resolve
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
})

// Keep the latest message in view as the conversation grows.
watch(() => assistant.thread.length, async () => {
  await nextTick()
  if (threadEl.value) threadEl.value.scrollTop = threadEl.value.scrollHeight
})

// Editable copy of the proposed transactions.
watch(result, (value) => {
  if (value?.type !== 'confirm' || value.intent !== 'create_registers') return
  draft.value = value.params.items.map((item) => ({
    type: item.type,
    amount: item.amount,
    date: item.date,
    description: item.description,
    category: item.category || `new:${item.categoryName}`,
    newCategoryName: item.createCategory ? item.categoryName : null,
    wallet: item.wallet || null,
  }))
  ensureLists()
})

// Category and wallet options are needed by the review form; load them if the page did not.
const ensureLists = () => {
  if (!categoriesStore.categories.length) categoriesStore.fetchAll().catch((e) => console.error('categories load failed', e))
  if (!walletsStore.wallets.length) walletsStore.fetchAll().catch((e) => console.error('wallets load failed', e))
}

const categoryOptions = (item) => {
  const options = categoriesStore.categories
    .filter((c) => c.type === item.type)
    .map((c) => ({ title: c.name, value: c._id }))
  if (item.newCategoryName) {
    options.unshift({ title: t('assistant.newCategory', { name: item.newCategoryName }), value: `new:${item.newCategoryName}` })
  }
  return options
}

const walletOptions = computed(() => [
  { title: t('assistant.noWallet'), value: null },
  ...walletsStore.wallets.map((w) => ({ title: w.name, value: w._id })),
])

const onConfirm = async () => {
  let params = null
  if (result.value.intent === 'create_registers') {
    params = {
      items: draft.value.map((item) => {
        const isNew = String(item.category || '').startsWith('new:')
        return {
          type: item.type,
          amount: item.amount,
          date: item.date,
          description: item.description,
          ...(isNew ? { categoryName: item.category.slice(4) } : { category: item.category }),
          wallet: item.wallet || null,
        }
      }),
    }
  }
  const done = await assistant.confirm(params)
  if (done) {
    snackbar.success(done.reply)
    if (done.result?.categoryIds?.length) categoriesStore.fetchAll().catch(() => {})
  }
}

const onUndo = async () => {
  try {
    const res = await assistant.undo()
    snackbar.info(res.reply)
  } catch (e) {
    snackbar.error(e?.response?.data?.message || t('assistant.error'))
  }
  onClose()
}

const onClose = () => {
  pendingQuestion.value = ''
  if (listening.value) cancelMic()
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  // Closing with a pending preview discards it, same as pressing Cancel.
  if (result.value?.type === 'confirm') assistant.cancel()
  else assistant.close()
}

// Opening the sheet starts listening right away when dictation is available.
watch(() => assistant.visible, (visible) => {
  if (visible) ensureLists()
  if (visible && isSupported.value && assistant.state === 'idle') toggleMic()
  if (!visible && listening.value) cancelMic()
})

watch(listening, (value) => {
  if (!value && assistant.state === 'listening' && !liveTranscript.value) assistant.state = 'idle'
})
</script>

<style scoped>
.vf {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 100dvh;
  min-width: 0;
  overflow: hidden;
  color: var(--kf-text);
  background:
    linear-gradient(rgba(5, 24, 34, 0.8), rgba(5, 24, 34, 0.86)),
    url('@/assets/backgrounds/flow-bg-3.webp') center / cover no-repeat var(--kf-bg-deep);
  border: 1px solid rgba(34, 211, 197, 0.22);
  border-radius: 24px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
}
@media (min-width: 960px) { .vf { min-width: 720px; max-height: 94vh; } }
@media (max-width: 599px) {
  .vf { height: 100dvh; border: 0; border-radius: 0; }
}

.vf-head { flex: none; display: flex; align-items: center; gap: 16px; padding: calc(28px + var(--safe-top, 0px)) 32px 0; }
.vf-mic {
  flex: none; width: 56px; height: 56px; display: grid; place-items: center;
  color: var(--kf-primary); background: rgba(0, 229, 208, 0.1);
  border: 1px solid rgba(0, 229, 208, 0.35); border-radius: 18px;
}
.vf-mic--active { animation: assistant-pulse 1.4s ease-out infinite; }
.vf-head__text { flex: 1; min-width: 0; }
.vf-head h2 { margin: 0; font-size: 1.625rem; font-weight: 700; line-height: 1.2; }
.vf-head p { margin: 4px 0 0; font-size: 1rem; color: var(--kf-text-secondary); }
.vf-close {
  flex: none; width: 48px; height: 48px; display: grid; place-items: center; cursor: pointer;
  color: var(--kf-text); background: rgba(15, 59, 71, 0.6); border: 1px solid var(--kf-border-subtle); border-radius: 50%;
}

.vf-body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 22px 32px 8px; }
.vf-transcript {
  display: inline-flex; align-items: center; gap: 12px; max-width: 100%; padding: 14px 20px; margin-bottom: 24px;
  background: rgba(9, 53, 65, 0.72); border: 1px solid rgba(34, 211, 197, 0.22); border-radius: 18px;
  font-style: italic; color: #dbe9ee; overflow-wrap: anywhere;
}
.vf-title { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
.vf-title h3 { margin: 0; font-size: 1.75rem; font-weight: 700; line-height: 1.25; }
.vf-hint {
  display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; font-size: 0.9rem; color: var(--kf-gold-bright);
  background: rgba(244, 184, 96, 0.06); border: 1px solid rgba(244, 184, 96, 0.3); border-radius: 18px;
}

.vf-card {
  display: flex; flex-direction: column; gap: 18px; padding: 24px; margin-bottom: 18px;
  background: rgba(7, 42, 54, 0.78); border: 1px solid rgba(34, 211, 197, 0.2); border-radius: 24px;
}
.vf-card__top { display: flex; align-items: center; gap: 8px; }
.vf-seg {
  flex: 1; max-width: 520px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px;
  background: rgba(9, 43, 56, 0.7); border: 1px solid rgba(118, 190, 205, 0.18); border-radius: 22px;
}
.vf-seg__btn {
  min-height: 64px; display: flex; align-items: center; justify-content: center; gap: 10px;
  font: inherit; font-size: 1.05rem; font-weight: 700; color: var(--kf-text-secondary);
  background: transparent; border: 0; border-radius: 18px; cursor: pointer;
  transition: background 180ms var(--kf-ease), color 180ms var(--kf-ease);
}
.vf-seg__btn.is-on { color: #052631; background: linear-gradient(135deg, #22d3c5, #00bfd0); }

.vf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.vf-field--wide { grid-column: 1 / -1; }
.vf-field {
  position: relative; min-width: 0; min-height: 78px; padding: 6px 18px; display: flex; align-items: center;
  background: rgba(18, 58, 72, 0.74); border: 1px solid rgba(118, 190, 205, 0.18); border-radius: 16px;
  transition: border-color 150ms var(--kf-ease);
}
.vf-field:focus-within { border-color: var(--kf-primary); }
.vf-field > * { width: 100%; }
.vf-field--wide { min-height: 86px; }
.vf-field :deep(.v-field__input) { font-size: 1.375rem; font-weight: 600; color: var(--kf-text); padding-top: 22px; padding-bottom: 4px; min-height: 0; }
.vf-field--amount :deep(.v-field__input) { font-size: 1.625rem; font-weight: 700; }
.vf-field :deep(.v-label) { font-size: 0.8125rem; color: var(--kf-text-secondary); opacity: 1; }
.vf-field :deep(.v-field__append-inner .v-icon) { color: var(--kf-text-secondary); opacity: 1; }
/* Native date picker indicator becomes an invisible hit area over the calendar icon */
.vf-field--date :deep(input::-webkit-calendar-picker-indicator) {
  position: absolute; right: 0; top: 0; width: 56px; height: 100%; opacity: 0; cursor: pointer;
}
.vf-field--date :deep(.v-field__append-inner) { pointer-events: none; }

.vf-chevron {
  width: 44px; height: 44px; margin: -8px -8px -8px 0; display: grid; place-items: center; cursor: pointer;
  color: var(--kf-text-secondary); background: transparent; border: 0; border-radius: 50%;
}
.vf-chevron:focus-visible { outline: 2px solid var(--kf-primary); }
.vf-listen { text-align: center; padding: 12px 0 4px; }
.vf-thread {
  display: flex; flex-direction: column; gap: 8px; width: 100%; max-height: 38vh; overflow-y: auto; margin-bottom: 16px;
}
.vf-msg {
  max-width: 86%; padding: 10px 14px; border-radius: 16px; line-height: 1.45; white-space: pre-line; overflow-wrap: anywhere;
}
.vf-msg--user {
  align-self: flex-end; background: rgba(34, 211, 197, 0.16); border: 1px solid rgba(34, 211, 197, 0.28); color: #dbe9ee;
}
.vf-msg--assistant {
  align-self: flex-start; background: rgba(9, 53, 65, 0.72); border: 1px solid rgba(255, 255, 255, 0.08); color: var(--kf-text);
}
.vf-chips--question { margin-bottom: 16px; }
.vf-question {
  margin: 0 auto 22px; max-width: 640px; padding: 16px 20px; font-size: 1.1rem; line-height: 1.5; text-align: left;
  background: rgba(9, 53, 65, 0.72); border: 1px solid rgba(34, 211, 197, 0.22); border-radius: 18px; white-space: pre-line;
}
.vf-listen__text { margin-top: 16px; font-size: 1.1rem; min-height: 1.5em; }
.vf-examples { margin-top: 20px; }
.vf-examples__title { margin-bottom: 10px; font-size: 0.85rem; color: var(--kf-text-secondary); }
.vf-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.vf-chip {
  min-height: 44px; padding: 8px 16px; font: inherit; font-size: 0.9rem; color: var(--kf-text); cursor: pointer;
  background: rgba(21, 65, 77, 0.66); border: 1px solid rgba(34, 211, 197, 0.18); border-radius: 18px;
}
.vf-chip:hover { border-color: var(--kf-primary-alt); }
.vf-thinking { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 36px 0; color: var(--kf-text-secondary); }
.vf-type { margin-top: 22px; }

.vf-actions { flex: none; padding: 18px 32px calc(24px + var(--safe-bottom, 0px)); }
.vf-actions__row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.vf-btn {
  min-height: 64px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font: inherit; font-size: 1.1rem; font-weight: 700; border-radius: 18px; cursor: pointer;
  transition: opacity 150ms, transform 150ms;
}
.vf-btn:active:not(:disabled) { transform: scale(0.98); }
.vf-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.vf-btn--ghost { color: var(--kf-text); background: rgba(11, 43, 56, 0.55); border: 1px solid rgba(97, 205, 215, 0.35); }
.vf-btn--primary { color: #052631; border: 0; background: linear-gradient(135deg, #22e1d0, #32b9f2); box-shadow: 0 10px 28px rgba(0, 215, 210, 0.2); }
.vf-btn--full { width: 100%; }
.vf-shortcut { margin-top: 14px; text-align: center; font-size: 0.8rem; color: #8faab4; }

.vf-close:focus-visible, .vf-seg__btn:focus-visible, .vf-btn:focus-visible, .vf-chip:focus-visible { outline: 2px solid var(--kf-primary); outline-offset: 2px; }

@media (max-width: 959px) {
  .vf-head { padding: calc(24px + var(--safe-top, 0px)) 24px 0; }
  .vf-body { padding: 22px 24px 8px; }
  .vf-actions { padding: 18px 24px calc(24px + var(--safe-bottom, 0px)); }
}
@media (max-width: 599px) {
  .vf-head { padding: calc(18px + var(--safe-top, 0px)) 18px 0; gap: 12px; }
  .vf-head h2 { font-size: 1.375rem; }
  .vf-head p { font-size: 0.9rem; }
  .vf-body { padding: 18px 18px 8px; }
  .vf-title h3 { font-size: 1.375rem; }
  .vf-card { padding: 16px; gap: 14px; }
  .vf-grid { grid-template-columns: 1fr; gap: 14px; }
  .vf-seg__btn { min-height: 56px; }
  .vf-actions { padding: 14px 18px calc(16px + var(--safe-bottom, 0px)); border-top: 1px solid var(--kf-divider); background: rgba(5, 24, 34, 0.92); }
  .vf-btn { min-height: 56px; }
}

.assistant-mic {
  width: 84px; height: 84px; border-radius: 50%; border: none; background: var(--kf-gradient-primary); color: var(--kf-on-primary);
  display: inline-flex; align-items: center; justify-content: center; box-shadow: var(--kf-glow); cursor: pointer;
}
.assistant-mic:disabled { opacity: 0.4; cursor: default; }
.assistant-mic--active { animation: assistant-pulse 1.4s ease-out infinite; }
@keyframes assistant-pulse {
  0% { box-shadow: 0 0 0 0 rgba(0, 229, 208, 0.5); }
  100% { box-shadow: 0 0 0 24px rgba(0, 229, 208, 0); }
}
.assistant-reply { white-space: pre-line; font-size: 1rem; line-height: 1.5; }
@media (prefers-reduced-motion: reduce) { .vf-mic--active, .assistant-mic--active { animation: none; } }
</style>
