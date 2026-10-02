<template>
  <v-bottom-sheet
    :model-value="assistant.visible"
    :inset="!isMobile"
    :max-width="isMobile ? undefined : 560"
    scrollable
    @update:model-value="(v) => (v ? assistant.open() : onClose())"
  >
    <v-card class="assistant-sheet" rounded="t-xl">
      <v-card-title class="d-flex align-center pt-4">
        <span class="kf-icon-tile mr-3"><v-icon size="20">mdi-microphone</v-icon></span>
        <span class="text-subtitle-1 font-weight-bold">{{ t('assistant.open') }}</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" :aria-label="t('assistant.close')" @click="onClose" />
      </v-card-title>

      <v-card-text class="pb-2">
        <!-- Listening / idle -->
        <div v-if="['idle', 'listening'].includes(assistant.state)" class="assistant-listen text-center">
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
          <div class="text-body-1 mt-3 assistant-transcript">
            {{ liveTranscript || (listening ? t('assistant.listening') : (isSupported ? t('assistant.tapToSpeak') : t('assistant.notSupported'))) }}
          </div>
          <div v-if="!listening && !liveTranscript" class="mt-4">
            <div class="text-caption text-medium-emphasis mb-2">{{ t('assistant.examplesTitle') }}</div>
            <div class="d-flex flex-wrap justify-center ga-2">
              <v-chip v-for="key in ['example1', 'example2', 'example3']" :key="key" size="small" variant="tonal" @click="send(t(`assistant.${key}`))">
                {{ t(`assistant.${key}`) }}
              </v-chip>
            </div>
          </div>
        </div>

        <!-- Thinking -->
        <div v-else-if="assistant.state === 'thinking'" class="text-center py-6">
          <v-progress-circular indeterminate color="primary" />
          <div class="text-body-2 mt-3 text-medium-emphasis">"{{ assistant.transcript }}"</div>
          <div class="text-caption mt-1">{{ t('assistant.thinking') }}</div>
        </div>

        <!-- Result -->
        <div v-else-if="result">
          <div class="text-caption text-medium-emphasis mb-2">"{{ assistant.transcript }}"</div>

          <template v-if="result.type === 'confirm'">
            <div class="text-body-2 mb-3">{{ result.summary?.split('\n')[0] }}</div>

            <template v-if="result.intent === 'create_registers'">
              <v-card v-for="(item, index) in draft" :key="index" variant="outlined" class="mb-3 pa-3">
                <div class="d-flex align-center mb-2">
                  <v-btn-toggle v-model="item.type" density="compact" mandatory divided color="primary" variant="outlined">
                    <v-btn value="expense" size="small">{{ t('assistant.expense') }}</v-btn>
                    <v-btn value="income" size="small">{{ t('assistant.income') }}</v-btn>
                  </v-btn-toggle>
                  <v-spacer />
                  <v-btn v-if="draft.length > 1" icon="mdi-close" size="x-small" variant="text" :aria-label="t('assistant.removeItem')" @click="draft.splice(index, 1)" />
                </div>
                <v-row dense>
                  <v-col cols="6">
                    <v-text-field v-model.number="item.amount" type="number" min="0" :label="t('assistant.amount')" density="compact" hide-details />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="item.date" type="date" :label="t('assistant.date')" density="compact" hide-details />
                  </v-col>
                  <v-col cols="6">
                    <v-select
                      v-model="item.category"
                      :items="categoryOptions(item)"
                      :label="t('assistant.category')"
                      density="compact"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-select
                      v-model="item.wallet"
                      :items="walletOptions"
                      :label="t('assistant.wallet')"
                      density="compact"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field v-model="item.description" :label="t('assistant.description')" density="compact" hide-details />
                  </v-col>
                </v-row>
              </v-card>
            </template>
            <div v-else class="assistant-reply">{{ result.summary }}</div>

            <v-alert v-if="result.error" type="error" variant="tonal" density="compact" class="mt-2">{{ result.error }}</v-alert>
          </template>

          <div v-else class="assistant-reply" :class="{ 'text-error': result.type === 'error' }">
            {{ result.reply || t('assistant.error') }}
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="px-4 pb-4 flex-column align-stretch ga-2">
        <div v-if="result?.type === 'confirm'" class="d-flex ga-2">
          <v-btn variant="text" class="flex-grow-1" :disabled="assistant.busy" @click="assistant.cancel()">{{ t('assistant.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" class="flex-grow-1" :loading="assistant.busy" @click="onConfirm">{{ t('assistant.confirm') }}</v-btn>
        </div>
        <div v-else-if="result?.type === 'done'" class="d-flex ga-2">
          <v-btn variant="text" prepend-icon="mdi-undo" class="flex-grow-1" @click="onUndo">{{ t('assistant.undo') }}</v-btn>
          <v-btn color="primary" variant="flat" class="flex-grow-1" @click="onClose">{{ t('assistant.close') }}</v-btn>
        </div>
        <v-btn v-else-if="['result', 'error'].includes(assistant.state)" variant="tonal" prepend-icon="mdi-microphone" @click="restart">
          {{ t('assistant.tryAgain') }}
        </v-btn>

        <v-text-field
          v-if="result?.type !== 'confirm'"
          v-model="typed"
          :placeholder="t('assistant.typePlaceholder')"
          density="compact"
          variant="outlined"
          hide-details
          :disabled="assistant.state === 'thinking'"
          append-inner-icon="mdi-send"
          @click:append-inner="send(typed)"
          @keydown.enter.prevent="send(typed)"
        />
        <div v-if="!isMobile" class="text-caption text-medium-emphasis text-center">{{ t('assistant.shortcut') }}</div>
      </v-card-actions>
    </v-card>
  </v-bottom-sheet>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import { Capacitor } from '@capacitor/core'
import { useAssistantStore, ROUTE_PATHS } from '@/stores/assistant'
import { useCategoriesStore } from '@/stores/categories'
import { useWalletsStore } from '@/stores/wallets'
import { useSnackbar } from '@/stores/snackbar'
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
const draft = ref([])
const viaVoice = ref(false)
const result = computed(() => assistant.result)

const { isSupported, listening, transcript: liveTranscript, start, stop, cancel: cancelMic } = useSpeechRecognition({
  onResult: (text) => { viaVoice.value = true; interpret(text) },
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
  if (viaVoice.value && ['answer', 'clarify'].includes(data.type)) speak(data.reply)
}

const send = (text) => {
  if (!text?.trim() || assistant.state === 'thinking') return
  if (listening.value) cancelMic()
  viaVoice.value = false
  typed.value = ''
  interpret(text)
}

const toggleMic = () => {
  if (listening.value) { stop(); return }
  assistant.state = 'listening'
  start()
}

const restart = () => {
  assistant.reset()
  toggleMic()
}

// Spoken replies only on the web build (speechSynthesis); the native app shows text.
const speak = (text) => {
  if (!text || Capacitor.isNativePlatform() || !('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance(text.replace(/•/g, ''))
  utterance.lang = locale.value === 'en' ? 'en-US' : 'es-ES'
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

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
  if (!categoriesStore.categories.length) categoriesStore.fetchAll().catch(() => {})
  if (!walletsStore.wallets.length) walletsStore.fetchAll().catch(() => {})
})

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
  if (listening.value) cancelMic()
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  // Closing with a pending preview discards it, same as pressing Cancel.
  if (result.value?.type === 'confirm') assistant.cancel()
  else assistant.close()
}

// Opening the sheet starts listening right away when dictation is available.
watch(() => assistant.visible, (visible) => {
  if (visible && isSupported.value && assistant.state === 'idle') toggleMic()
  if (!visible && listening.value) cancelMic()
})

watch(listening, (value) => {
  if (!value && assistant.state === 'listening' && !liveTranscript.value) assistant.state = 'idle'
})
</script>

<style scoped>
.assistant-sheet {
  padding-bottom: var(--safe-bottom, 0px);
}
.assistant-listen {
  padding: 12px 0 4px;
}
.assistant-mic {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  border: none;
  background: var(--kf-gradient-primary);
  color: var(--kf-on-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--kf-glow);
  cursor: pointer;
  transition: transform 0.15s ease;
}
.assistant-mic:disabled {
  opacity: 0.4;
  cursor: default;
}
.assistant-mic--active {
  background: var(--kf-gradient-primary);
  animation: assistant-pulse 1.4s ease-out infinite;
}
@keyframes assistant-pulse {
  0% { box-shadow: 0 0 0 0 rgba(0, 229, 208, 0.5); }
  100% { box-shadow: 0 0 0 24px rgba(0, 229, 208, 0); }
}
.assistant-transcript {
  min-height: 1.5em;
}
.assistant-reply {
  white-space: pre-line;
  font-size: 0.95rem;
  line-height: 1.5;
}
</style>
