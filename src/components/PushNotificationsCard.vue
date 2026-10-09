<template>
  <v-card :title="t('profile.pushNotifications.title')" :subtitle="t('profile.pushNotifications.subtitle')">
    <v-card-text>
      <p class="text-body-2 text-medium-emphasis mb-3">{{ t('profile.pushNotifications.description') }}</p>

      <v-alert v-if="!push.available" type="info" variant="tonal" density="compact" :text="t('profile.pushNotifications.unsupported')" />
      <template v-else>
        <v-switch
          :model-value="push.enabled"
          :loading="push.busy"
          :disabled="push.busy"
          color="primary"
          density="compact"
          hide-details
          :label="t('profile.pushNotifications.enable')"
          @update:model-value="toggle"
        />
        <v-alert v-if="push.error" type="warning" variant="tonal" density="compact" class="mt-2" :text="t(`profile.pushNotifications.${push.error}`)" />
        <v-alert v-if="push.local" type="info" variant="tonal" density="compact" class="mt-2" :text="t('profile.pushNotifications.localHint')" />
        <v-alert v-if="showIosHint" type="info" variant="tonal" density="compact" class="mt-2" :text="t('profile.pushNotifications.iosHint')" />
        <v-btn v-if="push.enabled" variant="outlined" size="small" class="mt-3" prepend-icon="mdi-bell-ring-outline" :loading="testing" @click="sendTest">
          {{ t('profile.pushNotifications.test') }}
        </v-btn>
      </template>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePushStore } from '@/stores/push'
import { useSnackbar } from '@/stores/snackbar'

const { t } = useI18n()
const push = usePushStore()
const snackbar = useSnackbar()
const testing = ref(false)

// Safari on iPhone only delivers web notifications to an installed (Home Screen) app.
const showIosHint = computed(() => push.platform === 'web' && /iPhone|iPad/.test(navigator.userAgent)
  && !window.matchMedia('(display-mode: standalone)').matches)

const toggle = (value) => (value ? push.enable() : push.disable())

const sendTest = async () => {
  testing.value = true
  try {
    const result = await push.sendTest()
    if (result.sent > 0) snackbar.success(t('profile.pushNotifications.testSent'))
    else if (result.devices === 0) snackbar.info(t('profile.pushNotifications.testNoDevice'))
    else snackbar.error(t('profile.pushNotifications.testFailed', { reason: (result.reasons || []).join(' · ') || '?' }))
  } catch {
    snackbar.error(t('common.error'))
  }
  testing.value = false
}
</script>
