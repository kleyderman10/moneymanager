<template>
  <v-card :title="t('capture.title')" :subtitle="t('capture.subtitle')">
    <v-card-text>
      <p class="text-body-2 text-medium-emphasis mb-3">{{ t('capture.description') }}</p>

      <!-- Android (app instalada): servicio nativo que lee las notificaciones del banco -->
      <template v-if="android">
        <div class="d-flex flex-wrap ga-2 mb-3">
          <v-chip size="small" :color="status.listenerGranted ? 'success' : 'warning'" variant="tonal">
            {{ status.listenerGranted ? t('capture.accessGranted') : t('capture.accessMissing') }}
          </v-chip>
          <v-chip size="small" :color="active ? 'success' : undefined" variant="tonal">
            {{ active ? t('capture.on') : t('capture.off') }}
          </v-chip>
        </div>
        <v-btn v-if="!active" color="primary" prepend-icon="mdi-bell-badge-outline" :loading="busy" @click="disclosure = true">{{ t('capture.activate') }}</v-btn>
        <div v-else class="d-flex flex-wrap ga-2">
          <v-btn v-if="!status.listenerGranted" color="primary" variant="tonal" @click="NotificationCapture.openSettings()">{{ t('capture.grantAccess') }}</v-btn>
          <v-btn variant="outlined" color="error" :loading="busy" @click="deactivate">{{ t('capture.deactivate') }}</v-btn>
        </div>
        <div class="text-caption text-medium-emphasis mt-2">{{ t('capture.androidHint') }}</div>
        <v-divider class="my-4" />
      </template>

      <!-- Atajo de iPhone (también sirve en cualquier dispositivo con una app que haga peticiones) -->
      <div class="text-subtitle-2 mb-1">{{ t('capture.shortcutTitle') }}</div>
      <p class="text-caption text-medium-emphasis mb-2">{{ t('capture.shortcutIntro') }}</p>
      <v-btn variant="tonal" size="small" prepend-icon="mdi-key-plus" :loading="creating" @click="createShortcutKey">{{ t('capture.generateKey') }}</v-btn>

      <v-alert v-if="newToken" type="success" variant="tonal" density="compact" class="mt-3">
        <div class="text-body-2 mb-2">{{ t('capture.keyOnce') }}</div>
        <div v-for="field in shortcutFields" :key="field.label" class="mb-2">
          <div class="text-caption">{{ field.label }}</div>
          <div class="d-flex align-center ga-1">
            <code class="capture-code flex-grow-1">{{ field.value }}</code>
            <v-btn icon="mdi-content-copy" size="x-small" variant="text" :aria-label="t('splits.copyLink')" @click="copy(field.value)" />
          </div>
        </div>
        <ol class="text-caption pl-4 mt-2">
          <li v-for="step in steps" :key="step">{{ step }}</li>
        </ol>
      </v-alert>

      <div v-if="tokens.length" class="mt-4">
        <div class="text-subtitle-2 mb-1">{{ t('capture.connections') }}</div>
        <v-list density="compact" bg-color="transparent">
          <v-list-item v-for="token in tokens" :key="token.id" :title="token.label || platformLabel(token.platform)" :subtitle="token.lastUsedAt ? t('capture.lastUsed', { date: date(token.lastUsedAt) }) : t('capture.neverUsed')">
            <template #append>
              <v-btn icon="mdi-delete-outline" size="small" variant="text" color="error" :aria-label="t('capture.revoke')" @click="revoke(token)" />
            </template>
          </v-list-item>
        </v-list>
      </div>
    </v-card-text>

    <v-dialog v-model="disclosure" max-width="460">
      <v-card :title="t('capture.disclosureTitle')">
        <v-card-text>
          <p class="text-body-2 mb-2">{{ t('capture.disclosure1') }}</p>
          <p class="text-body-2 mb-2">{{ t('capture.disclosure2') }}</p>
          <p class="text-body-2">{{ t('capture.disclosure3') }}</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="disclosure = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" :loading="busy" @click="activate">{{ t('capture.accept') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { captureAPI } from '@/api'
import { useSnackbar } from '@/stores/snackbar'
import { useLocale } from '@/composables/useLocale'
import { NotificationCapture, isAndroidNative, BANK_PACKAGES, apiBaseUrl } from '@/services/notificationCapture'

const { t } = useI18n()
const { date } = useLocale()
const snackbar = useSnackbar()

const android = isAndroidNative()
const status = ref({ listenerGranted: false, enabled: false, configured: false })
const active = computed(() => status.value.enabled && status.value.configured)
const tokens = ref([])
const newToken = ref('')
const creating = ref(false)
const busy = ref(false)
const disclosure = ref(false)

const ingestUrl = computed(() => `${apiBaseUrl()}/pending-registers/ingest`)
const shortcutFields = computed(() => [
  { label: t('capture.fieldUrl'), value: ingestUrl.value },
  { label: t('capture.fieldHeader'), value: `Bearer ${newToken.value}` },
  { label: t('capture.fieldBody'), value: '{ "text": <mensaje>, "source": "shortcut" }' },
])
const steps = computed(() => [t('capture.step1'), t('capture.step2'), t('capture.step3')])

const platformLabel = (platform) => ({ ios: 'iPhone', android: 'Android' }[platform] || t('capture.otherDevice'))
const errorMessage = (error) => error?.response?.data?.message || t('capture.error')

const loadTokens = async () => {
  try {
    tokens.value = (await captureAPI.getAll()).data
  } catch { /* la lista es informativa */ }
}

const refreshStatus = async () => {
  if (!android) return
  try {
    status.value = await NotificationCapture.status()
  } catch { /* plugin no disponible en esta compilación */ }
}

const copy = async (value) => {
  try {
    await navigator.clipboard.writeText(value)
    snackbar.success(t('splits.linkCopied'))
  } catch {
    snackbar.error(t('splits.shareError'))
  }
}

const createShortcutKey = async () => {
  creating.value = true
  try {
    newToken.value = (await captureAPI.create({ label: t('capture.iphoneShortcut'), platform: 'ios' })).data.token
    await loadTokens()
  } catch (error) {
    snackbar.error(errorMessage(error))
  }
  creating.value = false
}

const activate = async () => {
  busy.value = true
  try {
    // Una conexión por dispositivo: si ya había una de Android, se reemplaza.
    const previous = tokens.value.filter((token) => token.platform === 'android')
    await Promise.all(previous.map((token) => captureAPI.revoke(token.id)))
    const { token } = (await captureAPI.create({ label: 'Android', platform: 'android' })).data
    status.value = await NotificationCapture.configure({ baseUrl: apiBaseUrl(), token, packages: BANK_PACKAGES, enabled: true })
    disclosure.value = false
    await loadTokens()
    if (!status.value.listenerGranted) await NotificationCapture.openSettings()
  } catch (error) {
    snackbar.error(errorMessage(error))
  }
  busy.value = false
}

const deactivate = async () => {
  busy.value = true
  try {
    await Promise.all(tokens.value.filter((token) => token.platform === 'android').map((token) => captureAPI.revoke(token.id)))
    status.value = await NotificationCapture.clear()
    await loadTokens()
  } catch (error) {
    snackbar.error(errorMessage(error))
  }
  busy.value = false
}

const revoke = async (token) => {
  try {
    await captureAPI.revoke(token.id)
    if (android && token.platform === 'android') status.value = await NotificationCapture.clear()
    if (token.platform === 'ios') newToken.value = ''
    await loadTokens()
  } catch (error) {
    snackbar.error(errorMessage(error))
  }
}

// Al volver de la pantalla de ajustes del sistema se vuelve a leer si el usuario dio el permiso.
const onVisible = () => { if (document.visibilityState === 'visible') refreshStatus() }
onMounted(() => {
  loadTokens()
  refreshStatus()
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))
</script>

<style scoped>
.capture-code { overflow-wrap: anywhere; padding: 4px 6px; border-radius: 6px; background: rgba(0, 0, 0, 0.25); font-size: 0.75rem; }
</style>
