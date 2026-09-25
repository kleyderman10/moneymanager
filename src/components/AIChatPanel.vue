<template>
  <div>
    <v-btn
      color="secondary"
      size="large"
      class="ai-fab"
      data-tour="ai-chat"
      :style="fabStyle"
      @click="chatStore.toggle"
    >
      <v-icon>mdi-robot</v-icon>
      <v-tooltip activator="parent" location="left">{{ t('aiChat.assistantName') }}</v-tooltip>
    </v-btn>

    <v-navigation-drawer
      v-model="chatStore.visible"
      location="right"
      temporary
      width="380"
      class="chat-drawer"
    >
      <template #prepend>
        <v-toolbar color="secondary" theme="dark" density="comfortable">
          <v-toolbar-title class="text-body-1">
            <v-icon class="mr-1" color="primary">mdi-auto-awesome</v-icon> {{ t('aiChat.financialAssistant') }}
          </v-toolbar-title>
          <v-spacer />
          <v-btn icon size="small" variant="text" @click="chatStore.clearHistory">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
          <v-btn icon size="small" variant="text" @click="chatStore.close">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
      </template>

      <div class="d-flex flex-column fill-height">
        <div class="chat-messages flex-grow-1 pa-2" ref="msgContainer">
          <div v-if="chatStore.messages.length === 0" class="text-center text-grey pa-6">
            <v-icon size="48" color="primary">mdi-chat-processing-outline</v-icon>
            <div class="mt-2 font-weight-bold">{{ t('aiChat.letsTalk') }}</div>
            <div class="text-caption mt-1">{{ t('aiChat.tryExample') }}</div>
          </div>

          <div
            v-for="(msg, i) in chatStore.messages"
            :key="i"
            :class="msg.role === 'user' ? 'd-flex justify-end' : 'd-flex justify-start'"
            class="mb-2"
          >
            <v-card
              :color="msg.role === 'user' ? 'primary' : 'grey-lighten-3'"
              :class="msg.role === 'user' ? 'text-white' : ''"
              max-width="85%"
              class="px-3 py-2"
              elevation="1"
            >
              <div class="text-body-2" style="white-space: pre-wrap">{{ msg.content }}</div>
              <div :class="msg.role === 'user' ? 'text-right' : 'text-left'" class="text-caption mt-1 text-grey">
                {{ msg.role === 'user' ? t('aiChat.you') : t('aiChat.assistant') }}
              </div>
            </v-card>
          </div>

          <div v-if="chatStore.loading" class="d-flex justify-start mb-2">
            <v-card color="grey-lighten-3" class="px-4 py-2">
              <v-progress-circular indeterminate size="16" color="primary" />
            </v-card>
          </div>
        </div>

        <div class="pa-2 border-t">
          <div class="d-flex">
            <v-text-field
              v-model="input"
              :placeholder="t('aiChat.inputPlaceholder')"
              density="compact"
              hide-details
              variant="outlined"
              @keyup.enter="send"
              :disabled="chatStore.loading"
            />
            <v-btn
              icon="mdi-send"
              color="primary"
              size="small"
              class="ml-1"
              :disabled="!input.trim() || chatStore.loading"
              @click="send"
            />
          </div>
        </div>
      </div>
    </v-navigation-drawer>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import { useAiChatStore } from '@/stores/aiChat'

const { t } = useI18n()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)

// Stacked above the per-view "+ Nuevo" FAB (.finance-fab, bottom: 88px, 56px tall, right: 16px)
// with a clean 16px gap between them so the two floating buttons never touch or overlap.
const fabStyle = computed(() => ({
  position: 'fixed',
  bottom: isMobile.value ? 'calc(160px + var(--safe-bottom))' : 'calc(24px + var(--safe-bottom))',
  right: isMobile.value ? '16px' : '24px',
  zIndex: '100',
}))

const chatStore = useAiChatStore()
const input = ref('')
const msgContainer = ref(null)

const send = async () => {
  if (!input.value.trim()) return
  await chatStore.sendMessage(input.value.trim())
  input.value = ''
  await nextTick()
  scrollDown()
}

const scrollDown = () => {
  if (msgContainer.value) {
    msgContainer.value.scrollTop = msgContainer.value.scrollHeight
  }
}

watch(() => chatStore.visible, (v) => {
  if (v) {
    chatStore.fetchHistory()
    nextTick(() => scrollDown())
  }
})
</script>

<style scoped>
.chat-messages {
  overflow-y: auto;
  max-height: calc(100vh - 120px);
}
.border-t {
  border-top: 1px solid rgba(0,0,0,0.12);
}
</style>
