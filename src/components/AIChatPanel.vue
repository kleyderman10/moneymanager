<template>
  <div>
    <v-btn
      color="secondary"
      size="large"
      class="ai-fab"
      data-tour="ai-chat"
      :style="fabStyle"
      :aria-label="t('aiChat.assistantName')"
      @click="chatStore.toggle"
    >
      <v-icon>mdi-robot</v-icon>
      <v-tooltip activator="parent" location="left">{{ t('aiChat.assistantName') }}</v-tooltip>
    </v-btn>

    <v-dialog
      v-model="chatStore.visible"
      :fullscreen="isMobile"
      :max-width="isMobile ? undefined : 540"
      :transition="isMobile ? 'dialog-bottom-transition' : 'dialog-transition'"
      content-class="ai-dialog"
      scrim="#02121a"
    >
      <section class="ai-chat">
        <header class="ai-chat__header">
          <span class="ai-chat__logo"><img :src="symbol" alt="" /></span>
          <div class="ai-chat__titles">
            <h2>{{ t('aiChat.title') }}</h2>
            <p>{{ t('aiChat.subtitle') }}</p>
          </div>
          <button
            type="button"
            class="ai-chat__icon-btn"
            :aria-label="t('aiChat.clear')"
            :disabled="!chatStore.messages.length"
            @click="confirmClear = true"
          >
            <v-icon size="22">mdi-delete-outline</v-icon>
          </button>
          <button type="button" class="ai-chat__icon-btn" :aria-label="t('aiChat.close')" @click="chatStore.close">
            <v-icon size="22">mdi-close</v-icon>
          </button>
        </header>

        <div ref="msgContainer" class="ai-chat__messages" @scroll.passive="onScroll">
          <div class="ai-info">
            <v-icon size="22" color="primary">mdi-information-outline</v-icon>
            <span>{{ t('aiChat.intro') }}</span>
          </div>

          <div v-if="!chatStore.messages.length && !chatStore.loading" class="ai-empty">
            <span class="ai-empty__logo"><img :src="symbol" alt="" /></span>
            <h3>{{ t('aiChat.emptyTitle') }}</h3>
            <div class="ai-chips">
              <button v-for="key in suggestionKeys" :key="key" type="button" class="ai-chip" @click="send(t(`aiChat.${key}`))">
                {{ t(`aiChat.${key}`) }}
              </button>
            </div>
          </div>

          <template v-for="(msg, i) in chatStore.messages" :key="i">
            <div v-if="msg.role === 'user'" class="ai-row ai-row--user">
              <div class="ai-user">
                <p>{{ msg.content }}</p>
                <time>{{ formatTime(msg.timestamp) }} <v-icon size="14" color="primary">mdi-check-all</v-icon></time>
              </div>
            </div>
            <div v-else class="ai-row">
              <AiAssistantMessage :content="msg.content" :time="formatTime(msg.timestamp)" />
            </div>
          </template>

          <div v-if="chatStore.loading" class="ai-row" role="status" aria-live="polite">
            <div class="ai-typing">
              <span class="ai-typing__logo"><img :src="symbol" alt="" /></span>
              <span>{{ t('aiChat.analyzing') }}</span>
              <span class="ai-typing__dots" aria-hidden="true"><i /><i /><i /></span>
            </div>
          </div>

          <div v-if="chatStore.error && !chatStore.loading" class="ai-row" role="alert">
            <div class="ai-error">
              <v-icon size="22" color="#ff6b6b">mdi-alert-circle-outline</v-icon>
              <span>{{ t('aiChat.errorMessage') }}</span>
              <button v-if="chatStore.lastFailed" type="button" @click="retry">{{ t('aiChat.retry') }}</button>
            </div>
          </div>
        </div>

        <button v-if="showJump" type="button" class="ai-jump" :aria-label="t('aiChat.jumpToLatest')" @click="scrollDown(true)">
          <v-icon size="20">mdi-arrow-down</v-icon>
        </button>

        <AiChatComposer
          :disabled="chatStore.loading"
          :placeholder="t('aiChat.inputPlaceholder')"
          :send-label="t('aiChat.send')"
          @send="send"
        />
      </section>
    </v-dialog>

    <v-dialog v-model="confirmClear" max-width="360">
      <v-card class="pa-2">
        <v-card-title>{{ t('aiChat.clearTitle') }}</v-card-title>
        <v-card-text>{{ t('aiChat.clearBody') }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmClear = false">{{ t('aiChat.cancel') }}</v-btn>
          <v-btn color="error" variant="flat" @click="doClear">{{ t('aiChat.clearConfirm') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import { useAiChatStore } from '@/stores/aiChat'
import AiAssistantMessage from '@/components/ai/AiAssistantMessage.vue'
import AiChatComposer from '@/components/ai/AiChatComposer.vue'
import symbol from '@/assets/branding/knexura-flow-symbol.png'

const { t, locale } = useI18n()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)

// Stacked above the per-view "+ Nuevo" FAB (.finance-fab, bottom: 88px, 56px tall, right: 16px)
// with a clean 16px gap between them so the two floating buttons never touch or overlap.
const fabStyle = computed(() => ({
  position: 'fixed',
  // On phones it stacks above the page's "+" action, which sits above the bottom navigation.
  bottom: isMobile.value ? 'calc(var(--kf-fab-bottom) + 68px)' : 'calc(24px + var(--safe-bottom))',
  right: isMobile.value ? '20px' : '24px',
  zIndex: '100',
}))

const suggestionKeys = ['chip1', 'chip2', 'chip3', 'chip4']

const chatStore = useAiChatStore()
const msgContainer = ref(null)
const confirmClear = ref(false)
const showJump = ref(false)
let stickToBottom = true

const formatTime = (ts) => {
  const d = ts ? new Date(ts) : new Date()
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(locale.value === 'en' ? 'en-US' : 'es-ES', { hour: 'numeric', minute: '2-digit' })
}

const scrollDown = (force = false) => {
  const el = msgContainer.value
  if (!el) return
  if (force) stickToBottom = true
  el.scrollTo({ top: el.scrollHeight, behavior: force ? 'smooth' : 'auto' })
}

const onScroll = () => {
  const el = msgContainer.value
  if (!el) return
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight
  stickToBottom = distance < 120
  showJump.value = distance > 400
}

const send = async (text) => {
  if (!text?.trim() || chatStore.loading) return
  stickToBottom = true
  const pending = chatStore.sendMessage(text.trim())
  await nextTick()
  scrollDown()
  await pending
}

const retry = async () => {
  stickToBottom = true
  await chatStore.retry()
}

const doClear = async () => {
  confirmClear.value = false
  await chatStore.clearHistory()
}

// Follow new content only while the user is already near the bottom.
watch(
  () => [chatStore.messages.length, chatStore.loading, chatStore.error],
  async () => {
    await nextTick()
    if (stickToBottom) scrollDown()
  },
)

watch(() => chatStore.visible, async (v) => {
  if (!v) return
  stickToBottom = true
  await chatStore.fetchHistory()
  await nextTick()
  scrollDown()
})
</script>

<style>
/* Dialog shell (unscoped: the dialog content is teleported) */
.ai-dialog { --ai-bg: var(--kf-bg-deep, #071f2b); }
.ai-dialog.v-overlay__content { max-height: 100dvh; }
</style>

<style scoped>
.ai-chat {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  color: var(--kf-text);
  background:
    linear-gradient(rgba(3, 18, 27, 0.65), rgba(3, 18, 27, 0.65)),
    url('@/assets/backgrounds/flow-bg-5.webp') center / cover no-repeat var(--kf-bg-deep, #071f2b);
}
@media (min-width: 600px) {
  .ai-chat {
    height: min(88vh, 820px);
    border-radius: 24px;
    border: 1px solid var(--kf-border-subtle);
    box-shadow: var(--kf-shadow-lg);
  }
}

/* Header */
.ai-chat__header {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: calc(14px + var(--safe-top, 0px)) 14px 14px 16px;
  background: rgba(7, 32, 44, 0.78);
  border-bottom: 1px solid rgba(0, 229, 208, 0.12);
}
.ai-chat__logo {
  flex: none;
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
}
.ai-chat__logo img { width: 40px; height: 40px; object-fit: contain; }
.ai-chat__titles { flex: 1; min-width: 0; margin-left: 4px; }
.ai-chat__titles h2 { font-size: 1.15rem; font-weight: 700; line-height: 1.25; margin: 0; }
.ai-chat__titles p { margin: 2px 0 0; font-size: 0.85rem; color: var(--kf-text-secondary); }
.ai-chat__icon-btn {
  flex: none;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  color: var(--kf-text);
  background: rgba(15, 59, 71, 0.6);
  border: 1px solid var(--kf-border-subtle);
  border-radius: 50%;
  cursor: pointer;
}
.ai-chat__icon-btn:disabled { opacity: 0.4; cursor: default; }
.ai-chat__icon-btn:focus-visible,
.ai-chip:focus-visible,
.ai-jump:focus-visible { outline: 2px solid var(--kf-primary); outline-offset: 2px; }

/* Messages */
.ai-chat__messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
@media (hover: hover) {
  .ai-chat__messages { scrollbar-width: thin; scrollbar-color: rgba(155, 190, 198, 0.45) transparent; }
  .ai-chat__messages::-webkit-scrollbar { width: 5px; }
  .ai-chat__messages::-webkit-scrollbar-thumb { background: rgba(155, 190, 198, 0.45); border-radius: 5px; }
}
.ai-info {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 16px;
  font-size: 0.9rem;
  line-height: 1.45;
  color: var(--kf-text-secondary);
  background: rgba(15, 59, 71, 0.62);
  border: 1px solid rgba(34, 211, 197, 0.14);
  border-radius: 18px;
}
.ai-row { display: flex; animation: ai-in 180ms var(--kf-ease); }
.ai-row--user { justify-content: flex-end; }
@keyframes ai-in { from { opacity: 0; transform: translateY(6px); } }

.ai-user {
  max-width: 85%;
  padding: 12px 16px 8px;
  background: linear-gradient(135deg, rgba(0, 150, 160, 0.26), rgba(12, 70, 80, 0.75));
  border: 1px solid rgba(0, 229, 208, 0.45);
  border-radius: 22px 22px 6px 22px;
  color: #f4fbfc;
  overflow-wrap: anywhere;
}
.ai-user p { margin: 0; white-space: pre-wrap; font-size: 1rem; line-height: 1.45; user-select: text; }
.ai-user time { display: block; margin-top: 4px; text-align: right; font-size: 0.75rem; color: var(--kf-text-secondary); }

/* Empty */
.ai-empty { text-align: center; padding: 18px 4px 6px; }
.ai-empty__logo { display: inline-grid; place-items: center; width: 64px; height: 64px; }
.ai-empty__logo img { width: 56px; height: 56px; object-fit: contain; }
.ai-empty h3 { margin: 8px 0 16px; font-size: 1.1rem; font-weight: 700; }
.ai-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.ai-chip {
  min-height: 44px;
  padding: 8px 16px;
  font: inherit;
  font-size: 0.9rem;
  color: var(--kf-text);
  background: rgba(21, 65, 77, 0.66);
  border: 1px solid rgba(34, 211, 197, 0.18);
  border-radius: 18px;
  cursor: pointer;
  transition: border-color var(--kf-motion);
}
.ai-chip:hover,
.ai-chip:active { border-color: var(--kf-primary-alt); }

/* Typing */
.ai-typing {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  font-size: 0.9rem;
  color: var(--kf-text-secondary);
  background: rgba(10, 45, 58, 0.86);
  border: 1px solid rgba(50, 220, 210, 0.14);
  border-radius: 22px;
}
.ai-typing__logo img { width: 20px; height: 20px; display: block; }
.ai-typing__dots { display: inline-flex; gap: 4px; }
.ai-typing__dots i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--kf-primary);
  animation: ai-dot 1.2s ease-in-out infinite;
}
.ai-typing__dots i:nth-child(2) { animation-delay: 0.15s; }
.ai-typing__dots i:nth-child(3) { animation-delay: 0.3s; }
@keyframes ai-dot { 0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }

/* Error */
.ai-error {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 16px;
  font-size: 0.92rem;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.4);
  border-radius: 18px;
}
.ai-error span { flex: 1; min-width: 160px; }
.ai-error button {
  min-height: 40px;
  padding: 0 16px;
  font: inherit;
  font-weight: 600;
  color: #ff6b6b;
  background: transparent;
  border: 1px solid rgba(255, 107, 107, 0.6);
  border-radius: 20px;
  cursor: pointer;
}

/* Jump to latest */
.ai-jump {
  position: absolute;
  right: 18px;
  bottom: calc(92px + var(--safe-bottom, 0px));
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  color: var(--kf-primary);
  background: rgba(7, 32, 44, 0.95);
  border: 1px solid rgba(34, 211, 197, 0.35);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: var(--kf-shadow);
}

@media (prefers-reduced-motion: reduce) {
  .ai-row, .ai-typing__dots i { animation: none; }
}
</style>
