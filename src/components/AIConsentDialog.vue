<template>
  <v-dialog :model-value="visible" persistent max-width="520">
    <v-card :title="t('aiConsent.title')">
      <v-card-text>
        <p class="text-body-2 mb-3">
          {{ t('aiConsent.intro', { brand: t('layout.brandName') }) }}
        </p>
        <p class="text-body-2 mb-3">
          {{ t('aiConsent.sentTo') }} (<strong>{{ t('aiConsent.providers') }}</strong>, {{ t('aiConsent.providersSuffix') }}):
        </p>
        <v-list density="compact" class="pa-0 mb-3">
          <v-list-item prepend-icon="mdi-receipt-text-outline" :title="t('aiConsent.itemReceipts')" />
          <v-list-item prepend-icon="mdi-file-pdf-box" :title="t('aiConsent.itemStatements')" />
          <v-list-item prepend-icon="mdi-chat-outline" :title="t('aiConsent.itemChat')" />
          <v-list-item prepend-icon="mdi-finance" :title="t('aiConsent.itemSummary')" />
        </v-list>
        <p class="text-body-2 mb-0">
          {{ t('aiConsent.readMore') }}
          <a href="#" @click.prevent="openPrivacyPolicy">{{ t('aiConsent.privacyPolicyLink') }}</a>.
          {{ t('aiConsent.declineNotice') }}
        </p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          v-if="authStore.hasAcceptedAIConsent"
          color="error"
          variant="text"
          :loading="loading"
          @click="revoke"
        >
          {{ t('aiConsent.revoke') }}
        </v-btn>
        <v-btn v-else variant="text" :loading="loading" @click="decline">{{ t('aiConsent.notNow') }}</v-btn>
        <v-btn
          v-if="!authStore.hasAcceptedAIConsent"
          color="primary"
          :loading="loading"
          @click="accept"
        >
          {{ t('aiConsent.acceptAndContinue') }}
        </v-btn>
        <v-btn v-else variant="text" :loading="loading" @click="decline">{{ t('common.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useSnackbar } from '@/stores/snackbar'
import { openLegalLink, PRIVACY_POLICY_URL } from '@/utils/legalLinks'

const { t } = useI18n()

defineProps({
  visible: { type: Boolean, default: false },
})
const emit = defineEmits(['decline', 'accept'])

const authStore = useAuthStore()
const snackbar = useSnackbar()
const loading = ref(false)

const accept = async () => {
  loading.value = true
  const result = await authStore.acceptAIConsent()
  loading.value = false
  if (!result.success) return snackbar.error(result.message)
  emit('accept')
}

const revoke = async () => {
  loading.value = true
  const result = await authStore.revokeAIConsent()
  loading.value = false
  if (!result.success) return snackbar.error(result.message)
  snackbar.success(t('aiConsent.revoked'))
  emit('decline')
}

const openPrivacyPolicy = () => openLegalLink(PRIVACY_POLICY_URL)

const decline = () => emit('decline')
</script>
