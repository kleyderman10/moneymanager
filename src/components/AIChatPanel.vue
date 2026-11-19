<template>
  <div>
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
          <button type="button" class="ai-chat__back" :aria-label="t('aiChat.close')" @click="chatStore.close">
            <v-icon size="26">mdi-arrow-left</v-icon>
          </button>
          <span class="ai-chat__logo"><img :src="symbol" alt="" /></span>
          <div class="ai-chat__titles">
            <h2>{{ t('aiChat.title') }}</h2>
            <p>{{ t('aiChat.subtitle') }}</p>
          </div>
          <button type="button" class="ai-chat__icon-btn" :aria-label="t('aiChat.conversations')" @click="drawerOpen = true">
            <v-icon size="22">mdi-history</v-icon>
          </button>
          <button type="button" class="ai-chat__icon-btn" :aria-label="t('aiChat.newChat')" :disabled="chatStore.loading" @click="startNew">
            <v-icon size="22">mdi-plus</v-icon>
          </button>
        </header>

        <div ref="msgContainer" class="ai-chat__messages" @scroll.passive="onScroll">
          <div class="ai-info">
            <v-icon size="22" color="primary">mdi-information-outline</v-icon>
            <span>{{ t('aiChat.intro') }}</span>
          </div>
          <label class="ai-brief">
            <input type="checkbox" :checked="chatStore.brief" @change="chatStore.setBrief($event.target.checked)" />
            <span>{{ t('aiChat.brief') }}</span>
            <small>{{ t('aiChat.briefHint') }}</small>
          </label>

          <div v-if="chatStore.messages.length" class="ai-day">{{ t('common.today') }}</div>

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
              <AiAssistantMessage
                :content="msg.content"
                :time="formatTime(msg.timestamp)"
                :blocks="msg.blocks || []"
                :actions="!(chatStore.loading && i === chatStore.messages.length - 1)"
                :can-retry="i === chatStore.messages.length - 1 && !chatStore.loading"
                :speaking="speakingKey === i"
                :copied="copiedIndex === i"
                @copy="copyMessage(msg.content, i)"
                @listen="listenMessage(msg.content, i)"
                @retry="chatStore.regenerate()"
              />
            </div>
          </template>

          <div v-if="chatStore.suggestions.length && !chatStore.loading" class="ai-row ai-follow">
            <button v-for="s in chatStore.suggestions" :key="s" type="button" class="ai-chip" @click="send(s)">{{ s }}</button>
          </div>

          <div v-if="chatStore.loading && !chatStore.streaming" class="ai-row" role="status" aria-live="polite">
            <div class="ai-typing">
              <span class="ai-typing__logo"><img :src="symbol" alt="" /></span>
              <span>{{ chatStore.toolRunning ? t('aiChat.consulting') : t('aiChat.analyzing') }}</span>
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

        <div v-if="drawerOpen" class="ai-drawer-scrim" @click="drawerOpen = false"></div>
        <aside v-if="drawerOpen" class="ai-drawer" :aria-label="t('aiChat.conversations')">
          <header class="ai-drawer__head">
            <h3>{{ t('aiChat.conversations') }}</h3>
            <button type="button" class="ai-chat__icon-btn" :aria-label="t('aiChat.close')" @click="drawerOpen = false">
              <v-icon size="22">mdi-close</v-icon>
            </button>
          </header>
          <button type="button" class="ai-drawer__new" :disabled="chatStore.loading" @click="startNew">
            <v-icon size="20">mdi-plus</v-icon>{{ t('aiChat.newChat') }}
          </button>
          <ul class="ai-drawer__list">
            <li v-for="c in chatStore.conversations" :key="c.id" :class="{ 'is-active': c.id === chatStore.currentId }">
              <button type="button" class="ai-drawer__item" :disabled="chatStore.loading" @click="openConversation(c.id)">
                <span class="ai-drawer__title">{{ c.title }}</span>
                <time>{{ formatDay(c.updatedAt) }}</time>
              </button>
              <button type="button" class="ai-drawer__delete" :aria-label="t('aiChat.deleteConversation')" @click="askDelete(c.id)">
                <v-icon size="20">mdi-delete-outline</v-icon>
              </button>
            </li>
            <li v-if="!chatStore.conversations.length" class="ai-drawer__empty">{{ t('aiChat.noConversations') }}</li>
          </ul>
        </aside>

        <AiUsageMeter :usage="chatStore.usage" />

        <AiChatComposer
          :disabled="chatStore.loading"
          :can-stop="chatStore.loading"
          :placeholder="t('aiChat.inputPlaceholder')"
          :send-label="t('aiChat.send')"
          :stop-label="t('aiChat.stop')"
          :mic-label="t('aiChat.dictate')"
          :mic-stop-label="t('aiChat.stopDictate')"
          @send="send"
          @stop="chatStore.stop"
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
import { speakText, stopSpeaking, speakingKey } from '@/utils/speakText'
import AiUsageMeter from '@/components/ai/AiUsageMeter.vue'
import symbol from '@/assets/branding/knexura-flow-symbol.webp'

const { t, locale } = useI18n()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)

// The launcher lives in the top bar (MainLayout); this component is only the dialog.

const suggestionKeys = ['chip1', 'chip2', 'chip3', 'chip4']

const chatStore = useAiChatStore()
const msgContainer = ref(null)
const confirmClear = ref(false)
const drawerOpen = ref(false)
const pendingDeleteId = ref(null)
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

const copiedIndex = ref(null)
const copyMessage = async (text, index) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedIndex.value = index
    setTimeout(() => { if (copiedIndex.value === index) copiedIndex.value = null }, 1500)
  } catch { /* clipboard unavailable */ }
}
const listenMessage = (text, index) => {
  if (speakingKey.value === index) stopSpeaking()
  else speakText(text, locale.value === 'en' ? 'en' : 'es', index)
}
// Al cerrar el chat o cambiar de conversación se calla la lectura.
watch(() => [chatStore.visible, chatStore.currentId], stopSpeaking)

const retry = async () => {
  stickToBottom = true
  await chatStore.retry()
}

const askDelete = (id) => {
  pendingDeleteId.value = id
  confirmClear.value = true
}

const doClear = async () => {
  confirmClear.value = false
  if (pendingDeleteId.value) await chatStore.deleteConversation(pendingDeleteId.value)
  else await chatStore.clearHistory()
  pendingDeleteId.value = null
}

const startNew = () => {
  chatStore.newConversation()
  drawerOpen.value = false
}

const openConversation = async (id) => {
  await chatStore.openConversation(id)
  drawerOpen.value = false
  stickToBottom = true
  await nextTick()
  scrollDown()
}

const formatDay = (value) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(locale.value === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' })
}

// Follow new content only while the user is already near the bottom.
watch(
  () => [chatStore.messages.length, chatStore.messages.at(-1)?.content?.length, chatStore.loading, chatStore.error],
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
  gap: 4px;
  padding: calc(14px + var(--safe-top, 0px)) 12px 14px 12px;
  background: rgba(7, 32, 44, 0.78);
  border-bottom: 1px solid rgba(0, 229, 208, 0.12);
}
.ai-chat__back {
  flex: none;
  width: 44px;
  height: 44px;
  margin-left: -6px;
  display: grid;
  place-items: center;
  color: var(--kf-text);
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}
.ai-chat__back:focus-visible { outline: 2px solid var(--kf-primary); outline-offset: 2px; }
.ai-chat__logo {
  flex: none;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
}
.ai-chat__logo img { width: 40px; height: 40px; object-fit: contain; }
.ai-chat__titles { flex: 1; min-width: 0; margin-left: 4px; }
.ai-chat__titles h2 { font-size: 1.15rem; font-weight: 700; line-height: 1.25; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ai-chat__titles p { margin: 2px 0 0; font-size: 0.8rem; color: var(--kf-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ai-chat__icon-btn {
  flex: none;
  width: 40px;
  height: 40px;
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
.ai-brief {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 10px;
  align-items: center;
  align-self: flex-start;
  padding: 6px 14px;
  font-size: 0.85rem;
  color: var(--kf-text);
  background: rgba(15, 59, 71, 0.5);
  border: 1px solid rgba(34, 211, 197, 0.16);
  border-radius: 999px;
  cursor: pointer;
}
.ai-brief input { grid-row: span 2; width: 18px; height: 18px; accent-color: var(--kf-primary); }
.ai-brief small { color: var(--kf-text-secondary); font-size: 0.72rem; }
.ai-brief:focus-within { outline: 2px solid var(--kf-primary); outline-offset: 2px; }
.ai-day {
  align-self: center;
  padding: 4px 14px;
  font-size: 0.78rem;
  color: var(--kf-text-secondary);
  background: rgba(7, 32, 44, 0.75);
  border-radius: 999px;
}
.ai-row { display: flex; animation: ai-in 180ms var(--kf-ease); }
.ai-row--user { justify-content: flex-end; }
@keyframes ai-in { from { opacity: 0; transform: translateY(6px); } }

.ai-user {
  max-width: 82%;
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
.ai-follow { display: flex; flex-wrap: wrap; gap: 8px; padding-left: 46px; }
.ai-follow .ai-chip { min-height: 44px; font-size: 0.85rem; text-align: left; }
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

/* Conversation list */
.ai-drawer-scrim { position: absolute; inset: 0; z-index: 5; background: rgba(2, 18, 26, 0.6); }
.ai-drawer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 6;
  display: flex;
  flex-direction: column;
  width: min(86%, 340px);
  padding: calc(14px + var(--safe-top, 0px)) 12px calc(12px + var(--safe-bottom, 0px));
  background: rgba(7, 32, 44, 0.98);
  border-right: 1px solid rgba(34, 211, 197, 0.2);
  box-shadow: 8px 0 28px rgba(0, 0, 0, 0.4);
  animation: ai-slide 180ms var(--kf-ease);
}
@keyframes ai-slide { from { transform: translateX(-16px); opacity: 0; } }
.ai-drawer__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.ai-drawer__head h3 { margin: 0 0 0 6px; font-size: 1.05rem; }
.ai-drawer__new {
  display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 46px; margin-bottom: 10px;
  font: inherit; font-weight: 700; color: #052631; cursor: pointer; border: 0; border-radius: 16px;
  background: linear-gradient(135deg, #40e8dd, #00bdd0);
}
.ai-drawer__new:disabled { opacity: 0.45; cursor: default; }
.ai-drawer__list { flex: 1; min-height: 0; margin: 0; padding: 0; overflow-y: auto; list-style: none; }
.ai-drawer__list li { display: flex; align-items: center; gap: 4px; border-radius: 14px; }
.ai-drawer__list li.is-active { background: rgba(34, 211, 197, 0.14); }
.ai-drawer__item {
  flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; text-align: left;
  font: inherit; color: var(--kf-text); background: transparent; border: 0; cursor: pointer;
}
.ai-drawer__title { overflow: hidden; font-size: 0.92rem; text-overflow: ellipsis; white-space: nowrap; }
.ai-drawer__item time { font-size: 0.75rem; color: var(--kf-text-secondary); }
.ai-drawer__delete {
  flex: none; width: 40px; height: 40px; display: grid; place-items: center; color: var(--kf-text-secondary);
  background: transparent; border: 0; border-radius: 50%; cursor: pointer;
}
.ai-drawer__empty { padding: 18px 12px; font-size: 0.9rem; color: var(--kf-text-secondary); }
.ai-drawer__item:focus-visible, .ai-drawer__delete:focus-visible, .ai-drawer__new:focus-visible { outline: 2px solid var(--kf-primary); outline-offset: 2px; }

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
