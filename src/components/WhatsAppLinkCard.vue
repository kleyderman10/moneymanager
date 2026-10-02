<template>
  <v-col v-if="status?.enabled" cols="12" md="6">
    <v-card :title="t('whatsapp.title')">
      <v-card-text>
        <template v-if="status.linked">
          <v-alert type="success" density="compact" variant="tonal" class="mb-3" icon="mdi-whatsapp">
            {{ t('whatsapp.linkedTo', { phone: status.phone }) }}
          </v-alert>
          <p class="text-body-2 mb-3">{{ t('whatsapp.linkedBody') }}</p>
          <v-switch
            v-if="status.remindersAvailable"
            :model-value="status.remindersEnabled"
            :label="t('whatsapp.reminders')"
            :hint="t('whatsapp.remindersHint')"
            persistent-hint
            color="primary"
            density="compact"
            class="mb-3"
            :loading="saving"
            @update:model-value="toggleReminders"
          />
          <v-btn variant="text" color="error" block prepend-icon="mdi-link-off" :loading="saving" @click="unlink">
            {{ t('whatsapp.unlink') }}
          </v-btn>
        </template>

        <template v-else>
          <p class="text-body-2 mb-3">{{ t('whatsapp.intro') }}</p>
          <v-alert v-if="!authStore.hasAcceptedAIConsent" type="info" density="compact" variant="tonal" class="mb-3">
            {{ t('whatsapp.consentRequired') }}
          </v-alert>

          <div v-if="link" class="whatsapp-code mb-3">
            <div class="text-caption text-medium-emphasis">{{ t('whatsapp.sendThisCode') }}</div>
            <div class="whatsapp-code__value">VINCULAR {{ link.code }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ t('whatsapp.toNumber', { number: `+${link.businessNumber}` }) }} · {{ t('whatsapp.expires') }}
            </div>
          </div>

          <v-btn
            v-if="link"
            color="success"
            variant="flat"
            block
            prepend-icon="mdi-whatsapp"
            @click="openWhatsApp"
          >
            {{ t('whatsapp.openWhatsApp') }}
          </v-btn>
          <v-btn
            :color="link ? undefined : 'success'"
            :variant="link ? 'text' : 'flat'"
            block
            :class="{ 'mt-2': link }"
            :prepend-icon="link ? 'mdi-refresh' : 'mdi-whatsapp'"
            :disabled="!authStore.hasAcceptedAIConsent"
            :loading="loading"
            @click="createCode"
          >
            {{ link ? t('whatsapp.newCode') : t('whatsapp.connect') }}
          </v-btn>
          <v-btn v-if="link" variant="text" block class="mt-1" prepend-icon="mdi-check" @click="refresh">
            {{ t('whatsapp.alreadySent') }}
          </v-btn>
        </template>
      </v-card-text>
    </v-card>
  </v-col>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { whatsappAPI } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useSnackbar } from '@/stores/snackbar'
import { openLegalLink } from '@/utils/legalLinks'

const { t } = useI18n()
const authStore = useAuthStore()
const snackbar = useSnackbar()

const status = ref(null)
const link = ref(null)
const loading = ref(false)
const saving = ref(false)

const errorMessage = (e) => e?.response?.data?.message || t('assistant.error')

const refresh = async () => {
  try {
    status.value = (await whatsappAPI.status()).data
    if (status.value.linked) link.value = null
  } catch {
    status.value = null
  }
}

const createCode = async () => {
  loading.value = true
  try {
    link.value = (await whatsappAPI.createLinkCode()).data
  } catch (e) {
    snackbar.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

// wa.me opens the WhatsApp app with the message already typed; the user only taps Send.
const openWhatsApp = () => openLegalLink(link.value.waLink)

const unlink = async () => {
  saving.value = true
  try {
    status.value = (await whatsappAPI.unlink()).data
    snackbar.success(t('whatsapp.unlinked'))
  } catch (e) {
    snackbar.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}

const toggleReminders = async (value) => {
  saving.value = true
  try {
    status.value = (await whatsappAPI.updateSettings({ remindersEnabled: Boolean(value) })).data
  } catch (e) {
    snackbar.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}

onMounted(refresh)
</script>

<style scoped>
.whatsapp-code {
  border: 1px dashed rgba(var(--v-theme-success), 0.6);
  border-radius: 12px;
  padding: 12px;
  text-align: center;
}
.whatsapp-code__value {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin: 4px 0;
}
</style>
