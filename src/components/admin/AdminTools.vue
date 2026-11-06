<template>
  <div>
    <v-expansion-panels v-model="open" variant="accordion" multiple>
      <!-- Salud del sistema -->
      <v-expansion-panel value="health">
        <v-expansion-panel-title class="text-body-1 font-weight-bold">
          <v-icon class="mr-3">mdi-heart-pulse</v-icon>{{ t('admin.tools.health') }}
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-btn size="small" variant="tonal" prepend-icon="mdi-refresh" :loading="health.loading" class="mb-3" @click="loadHealth">{{ t('admin.stats.refresh') }}</v-btn>
          <div v-if="health.data" class="health-grid">
            <div v-for="row in healthRows" :key="row.label" class="health-tile">
              <v-icon :color="row.ok ? 'success' : 'warning'" size="20">{{ row.ok ? 'mdi-check-circle' : 'mdi-alert-circle-outline' }}</v-icon>
              <div>
                <div class="text-body-2 font-weight-medium">{{ row.label }}</div>
                <div class="text-caption text-medium-emphasis">{{ row.detail }}</div>
              </div>
            </div>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <!-- Correos inalcanzables -->
      <v-expansion-panel v-if="isAdmin" value="emails">
        <v-expansion-panel-title class="text-body-1 font-weight-bold">
          <v-icon class="mr-3">mdi-email-alert-outline</v-icon>{{ t('admin.tools.emails') }}
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <p class="text-body-2 text-medium-emphasis mb-3">{{ t('admin.tools.emailsHint') }}</p>
          <div class="d-flex flex-wrap ga-3 align-center mb-3">
            <v-select v-model="emails.scope" :items="scopeOptions" density="compact" hide-details style="max-width: 240px" :label="t('admin.tools.scope')" />
            <v-btn color="primary" variant="tonal" prepend-icon="mdi-magnify-scan" :loading="emails.loading" @click="scanEmails">{{ t('admin.tools.scan') }}</v-btn>
          </div>
          <template v-if="emails.result">
            <v-alert type="info" variant="tonal" density="compact" class="mb-3">
              {{ t('admin.tools.scanSummary', { scanned: emails.result.scanned, domains: emails.result.domainsChecked, flagged: emails.result.items.length, deletable: emails.result.deletable }) }}
              <div v-if="emails.result.unknownDomains" class="text-caption">{{ t('admin.tools.unknownDomains', { n: emails.result.unknownDomains }) }}</div>
              <div v-if="emails.result.truncated" class="text-caption">{{ t('admin.tools.truncated') }}</div>
            </v-alert>
            <div v-for="item in emails.result.items" :key="item.id" class="kf-row admin-row d-flex align-center ga-3">
              <v-checkbox-btn v-model="emails.selected" :value="item.id" :disabled="!item.deletable" :aria-label="item.email" />
              <div class="kf-row__body">
                <div class="kf-row__title">{{ item.email }}</div>
                <div class="kf-row__meta">{{ item.name }} · {{ date(item.createdAt) }}</div>
              </div>
              <v-chip v-if="item.deletable" size="small" color="success" variant="tonal">{{ t('admin.tools.noUsage') }}</v-chip>
              <v-chip v-else size="small" color="warning" variant="tonal">{{ usageLabel(item) }}</v-chip>
            </div>
            <div v-if="!emails.result.items.length" class="text-center text-medium-emphasis py-4">{{ t('admin.tools.noneFlagged') }}</div>
            <div v-if="emails.result.deletable" class="d-flex ga-3 mt-3 flex-wrap">
              <v-btn variant="text" @click="selectAllDeletable">{{ t('admin.tools.selectAll') }}</v-btn>
              <v-btn color="error" variant="flat" prepend-icon="mdi-delete-outline" :disabled="!emails.selected.length" @click="emails.confirm = true">
                {{ t('admin.tools.deleteSelected', { n: emails.selected.length }) }}
              </v-btn>
            </div>
          </template>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <!-- Registros pendientes -->
      <v-expansion-panel value="pending">
        <v-expansion-panel-title class="text-body-1 font-weight-bold">
          <v-icon class="mr-3">mdi-account-clock-outline</v-icon>{{ t('admin.tools.pending') }}
          <v-chip v-if="pending.items.length" size="x-small" class="ml-2">{{ pending.items.length }}</v-chip>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <p class="text-body-2 text-medium-emphasis mb-3">{{ t('admin.tools.pendingHint') }}</p>
          <v-btn size="small" variant="tonal" prepend-icon="mdi-refresh" :loading="pending.loading" class="mb-3" @click="loadPending">{{ t('admin.stats.refresh') }}</v-btn>
          <div v-for="item in pending.items" :key="item.id" class="kf-row admin-row d-flex align-center ga-2">
            <div class="kf-row__body">
              <div class="kf-row__title">{{ item.email }}</div>
              <div class="kf-row__meta">{{ item.name }} · {{ t('admin.tools.expires') }} {{ date(item.expiresAt) }}</div>
            </div>
            <v-btn size="small" variant="text" icon="mdi-email-fast-outline" :aria-label="t('admin.tools.resend')" :loading="busyId === item.id" @click="resendPending(item)" />
            <v-btn v-if="isAdmin" size="small" variant="text" color="error" icon="mdi-delete-outline" :aria-label="t('common.delete')" @click="removePending(item)" />
          </div>
          <div v-if="!pending.items.length && !pending.loading" class="text-center text-medium-emphasis py-4">{{ t('admin.tools.noPending') }}</div>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <!-- Avisos masivos -->
      <v-expansion-panel v-if="isAdmin" value="broadcast">
        <v-expansion-panel-title class="text-body-1 font-weight-bold">
          <v-icon class="mr-3">mdi-bullhorn-outline</v-icon>{{ t('admin.tools.broadcast') }}
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <p class="text-body-2 text-medium-emphasis mb-3">{{ t('admin.tools.broadcastHint') }}</p>
          <v-text-field v-model="bc.title" :label="t('admin.tools.bcTitle')" maxlength="60" counter density="compact" variant="outlined" />
          <v-textarea v-model="bc.body" :label="t('admin.tools.bcBody')" maxlength="200" counter rows="2" auto-grow density="compact" variant="outlined" />
          <div class="d-flex flex-wrap ga-3 mb-3">
            <v-select v-model="bc.segment.platform" :items="platformOptions" :label="t('admin.tools.bcPlatform')" density="compact" hide-details style="min-width: 160px; flex: 1" />
            <v-text-field v-model="bc.segment.appVersion" :label="t('admin.tools.bcVersion')" density="compact" hide-details style="min-width: 140px; flex: 1" />
            <v-text-field v-model.number="bc.segment.activeWithinDays" :label="t('admin.tools.bcActive')" type="number" min="1" density="compact" hide-details style="min-width: 160px; flex: 1" />
            <v-select v-model="bc.segment.subscriptionStatus" :items="subOptions" :label="t('admin.tools.bcPlan')" density="compact" hide-details style="min-width: 160px; flex: 1" />
          </div>
          <div class="d-flex flex-wrap ga-3 align-center">
            <v-btn variant="tonal" prepend-icon="mdi-account-search-outline" :loading="bc.counting" @click="countRecipients">{{ t('admin.tools.bcCount') }}</v-btn>
            <span v-if="bc.recipients !== null" class="text-body-2">{{ t('admin.tools.bcRecipients', { n: bc.recipients }) }}</span>
            <v-spacer />
            <v-btn color="primary" variant="flat" prepend-icon="mdi-send-outline" :disabled="!canSend" @click="bc.confirm = true">{{ t('admin.tools.bcSend') }}</v-btn>
          </div>
          <v-alert v-if="bc.result" type="success" variant="tonal" density="compact" class="mt-3">
            {{ t('admin.tools.bcDone', { delivered: bc.result.delivered, failed: bc.result.failed }) }}
          </v-alert>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <ConfirmDialog
      v-model="emails.confirm"
      :title="t('admin.tools.confirmDeleteTitle')"
      :message="t('admin.tools.confirmDeleteMsg', { n: emails.selected.length })"
      :confirm-label="t('common.delete')"
      :loading="emails.deleting"
      @confirm="purgeEmails"
    />
    <ConfirmDialog
      v-model="bc.confirm"
      :title="t('admin.tools.bcConfirmTitle')"
      :message="t('admin.tools.bcConfirmMsg', { n: bc.recipients ?? 0 })"
      :confirm-label="t('admin.tools.bcSend')"
      :loading="bc.sending"
      @confirm="sendBroadcast"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminAPI } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useSnackbar } from '@/stores/snackbar'
import { useLocale } from '@/composables/useLocale'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const { t } = useI18n()
const { date } = useLocale()
const snackbar = useSnackbar()
const isAdmin = computed(() => useAuthStore().isAdmin)
const open = ref(['health'])
const errorText = (e) => e?.response?.data?.message || t('common.loadError')

// --- Salud ---
const health = ref({ loading: false, data: null })
const loadHealth = async () => {
  health.value.loading = true
  try { health.value.data = (await adminAPI.getHealth()).data } catch (e) { snackbar.error(errorText(e)) }
  health.value.loading = false
}
const healthRows = computed(() => {
  const d = health.value.data
  if (!d) return []
  const on = (v) => (v ? t('admin.tools.on') : t('admin.tools.off'))
  return [
    { label: t('admin.tools.hDb'), ok: d.database === 'connected', detail: d.database },
    { label: t('admin.tools.hEmail'), ok: d.email.configured, detail: on(d.email.configured) },
    { label: t('admin.tools.hPush'), ok: Object.values(d.push || {}).some(Boolean), detail: Object.entries(d.push || {}).map(([k, v]) => `${k}: ${on(v)}`).join(' · ') },
    { label: t('admin.tools.hAi'), ok: d.ai.openai || d.ai.gemini || d.ai.ollama, detail: Object.entries(d.ai).map(([k, v]) => `${k}: ${on(v)}`).join(' · ') },
    { label: t('admin.tools.hWhatsapp'), ok: d.whatsapp.configured, detail: on(d.whatsapp.configured) },
    { label: t('admin.tools.hSessions'), ok: true, detail: String(d.counts.activeSessions) },
    { label: t('admin.tools.hLegacy'), ok: d.counts.unverifiedLegacy === 0, detail: String(d.counts.unverifiedLegacy) },
    { label: t('admin.tools.hRuntime'), ok: true, detail: `Node ${d.runtime.node} · ${d.runtime.memoryMb} MB · ${Math.round(d.runtime.uptimeSeconds / 3600)} h` },
  ]
})

// --- Correos inalcanzables ---
const emails = ref({ scope: 'all', loading: false, result: null, selected: [], confirm: false, deleting: false })
const scopeOptions = computed(() => [
  { title: t('admin.tools.scopeAll'), value: 'all' },
  { title: t('admin.tools.scopeUnverified'), value: 'unverified' },
])
const scanEmails = async () => {
  emails.value.loading = true
  emails.value.selected = []
  try { emails.value.result = (await adminAPI.scanEmails({ scope: emails.value.scope })).data } catch (e) { snackbar.error(errorText(e)) }
  emails.value.loading = false
}
const usageLabel = (item) => (item.lastLoginAt && !item.usage.total ? t('admin.tools.hasLogin') : t('admin.tools.hasUsage', { n: item.usage.total }))
const selectAllDeletable = () => { emails.value.selected = emails.value.result.items.filter((i) => i.deletable).map((i) => i.id) }
const purgeEmails = async () => {
  emails.value.deleting = true
  try {
    const { data } = await adminAPI.purgeEmails(emails.value.selected)
    snackbar.success(t('admin.tools.purged', { deleted: data.deleted.length, skipped: data.skipped.length }))
    emails.value.confirm = false
    await scanEmails()
  } catch (e) { snackbar.error(errorText(e)) }
  emails.value.deleting = false
}

// --- Pendientes ---
const pending = ref({ loading: false, items: [] })
const busyId = ref(null)
const loadPending = async () => {
  pending.value.loading = true
  try { pending.value.items = (await adminAPI.getPendingSignups()).data.items } catch (e) { snackbar.error(errorText(e)) }
  pending.value.loading = false
}
const resendPending = async (item) => {
  busyId.value = item.id
  try { await adminAPI.resendPendingSignup(item.id); snackbar.success(t('admin.tools.resent')) } catch (e) { snackbar.error(errorText(e)) }
  busyId.value = null
}
const removePending = async (item) => {
  try { await adminAPI.deletePendingSignup(item.id); await loadPending() } catch (e) { snackbar.error(errorText(e)) }
}

// --- Avisos masivos ---
const bc = ref({ title: '', body: '', segment: { platform: '', appVersion: '', activeWithinDays: null, subscriptionStatus: '' }, recipients: null, counting: false, sending: false, confirm: false, result: null })
const platformOptions = computed(() => [{ title: t('admin.all'), value: '' }, ...['android', 'ios', 'pwa', 'web'].map((p) => ({ title: t(`admin.stats.platform.${p}`), value: p }))])
const subOptions = computed(() => [{ title: t('admin.all'), value: '' }, ...['trialing', 'active', 'past_due', 'canceled', 'expired'].map((s) => ({ title: s, value: s }))])
const cleanSegment = () => Object.fromEntries(Object.entries(bc.value.segment).filter(([, v]) => v !== '' && v !== null && v !== undefined))
const canSend = computed(() => bc.value.title.trim() && bc.value.body.trim() && bc.value.recipients > 0)
const countRecipients = async () => {
  bc.value.counting = true
  bc.value.result = null
  try { bc.value.recipients = (await adminAPI.broadcast({ dryRun: true, segment: cleanSegment() })).data.recipients } catch (e) { snackbar.error(errorText(e)) }
  bc.value.counting = false
}
const sendBroadcast = async () => {
  bc.value.sending = true
  try {
    const { data } = await adminAPI.broadcast({ dryRun: false, confirm: true, title: bc.value.title, body: bc.value.body, segment: cleanSegment() })
    bc.value.result = data
    bc.value.confirm = false
  } catch (e) { snackbar.error(errorText(e)) }
  bc.value.sending = false
}

onMounted(() => { loadHealth(); loadPending() })
</script>

<style scoped>
.health-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.health-tile { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(128, 138, 150, 0.2); }
</style>
