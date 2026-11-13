<template>
  <div>
    <div class="page-intro">
      <div class="page-intro__eyebrow">{{ t('nav.adminSection') }}</div>
      <h1 :class="isMobile ? 'text-h5' : 'text-h4'">{{ t('nav.admin') }}</h1>
      <p class="page-intro__subtitle">{{ t('admin.subtitle') }}</p>
    </div>

    <v-alert v-if="admin.error" type="error" variant="tonal" closable class="mb-5">
      {{ admin.error }}
    </v-alert>

    <KfSegmented v-model="tab" :options="tabOptions" :block="isMobile" class="mb-5" />

    <v-window v-model="tab">
      <v-window-item value="overview">
        <v-row v-if="admin.overview" dense>
          <v-col cols="6" md="3">
            <KpiCard :label="t('admin.totalUsers')" :value="admin.overview.users.total" icon="mdi-account-outline" tone="primary" />
          </v-col>
          <v-col cols="6" md="3">
            <KpiCard :label="t('admin.activeUsers')" :value="admin.overview.users.active" icon="mdi-account-group-outline" tone="income" />
          </v-col>
          <v-col cols="6" md="3">
            <KpiCard :label="t('admin.deactivatedUsers')" :value="admin.overview.users.inactive" icon="mdi-account-cancel-outline" tone="expense" />
          </v-col>
          <v-col cols="6" md="3">
            <KpiCard :label="t('admin.admins')" :value="admin.overview.users.admins" icon="mdi-crown-outline" tone="gold" />
          </v-col>
        </v-row>

        <v-card v-if="admin.overview" class="mt-4">
          <v-card-title class="d-flex align-center ga-3 admin-card__title">
            <span class="kf-icon-tile kf-icon-tile--gold"><v-icon size="20">mdi-crown-outline</v-icon></span>
            <span class="text-body-1 font-weight-bold">{{ t('admin.subscriptionsByStatus') }}</span>
          </v-card-title>
          <v-card-text>
            <div class="status-grid">
              <div v-for="status in subscriptionStatuses" :key="status" class="status-tile">
                <div class="d-flex align-center justify-space-between">
                  <span class="status-tile__label">{{ statusLabel(status) }}</span>
                  <strong class="status-tile__count" :class="`text-${statusColor(status)}`">{{ admin.overview.subscriptions.byStatus[status] || 0 }}</strong>
                </div>
                <v-progress-linear
                  :model-value="statusShare(status)"
                  :color="statusColor(status)"
                  height="6"
                  rounded
                  class="mt-2"
                  :aria-label="statusLabel(status)"
                />
              </div>
            </div>
            <div class="text-body-2 text-medium-emphasis mt-4">
              {{ t('admin.withActiveAccess') }}: <strong>{{ admin.overview.subscriptions.activeEntitled }}</strong>
            </div>
          </v-card-text>
        </v-card>
      </v-window-item>

      <v-window-item value="users">
        <div class="d-flex flex-wrap ga-3 mb-4">
          <v-text-field
            v-model="userFilters.q"
            :label="t('admin.searchByNameOrEmail')"
            prepend-inner-icon="mdi-magnify"
            density="compact"
            hide-details
            :style="isMobile ? 'flex: 1 1 100%' : 'max-width: 280px'"
            @keyup.enter="loadUsers(1)"
          />
          <v-select
            v-model="userFilters.status"
            :items="statusFilterOptions"
            :label="t('subscription.status')"
            density="compact"
            hide-details
            :style="isMobile ? 'flex: 1 1 40%' : 'max-width: 180px'"
            @update:model-value="loadUsers(1)"
          />
          <v-select
            v-model="userFilters.role"
            :items="roleFilterOptions"
            :label="t('admin.role')"
            density="compact"
            hide-details
            :style="isMobile ? 'flex: 1 1 40%' : 'max-width: 180px'"
            @update:model-value="loadUsers(1)"
          />
          <v-select
            v-model="userFilters.platform"
            :items="platformFilterOptions"
            :label="t('admin.platform')"
            density="compact"
            hide-details
            :style="isMobile ? 'flex: 1 1 40%' : 'max-width: 180px'"
            @update:model-value="loadUsers(1)"
          />
          <v-select
            v-model="userFilters.inactiveDays"
            :items="inactiveFilterOptions"
            :label="t('admin.lastActivity')"
            density="compact"
            hide-details
            :style="isMobile ? 'flex: 1 1 40%' : 'max-width: 200px'"
            @update:model-value="loadUsers(1)"
          />
          <v-btn variant="tonal" prepend-icon="mdi-magnify" @click="loadUsers(1)">{{ t('common.search') }}</v-btn>
          <v-btn v-if="canAdminister" variant="text" prepend-icon="mdi-download" :loading="exporting" @click="exportUsers">{{ t('admin.exportCsv') }}</v-btn>
        </div>

        <!-- Phones: one card per user instead of a wide table. -->
        <div v-if="isMobile">
          <div v-for="user in admin.users" :key="user._id" class="kf-row admin-row">
            <div class="admin-row__main">
              <v-avatar size="40" class="kf-avatar admin-avatar" :style="{ '--avatar-bg': avatarColor(user.name) }">{{ (user.name || '?').trim()[0]?.toUpperCase() }}</v-avatar>
              <div class="kf-row__body">
                <div class="kf-row__title">{{ user.name }}</div>
                <div class="kf-row__meta admin-row__email">{{ user.email }}</div>
                <div class="kf-row__meta admin-row__email">{{ usageMeta(user) }}</div>
              </div>
            </div>
            <div class="d-flex flex-wrap align-center ga-2 mt-2">
              <v-chip size="small" :color="user.role === 'user' ? 'default' : 'primary'" variant="tonal">
                {{ roleLabel(user.role) }}
              </v-chip>
              <v-chip v-if="user.subscription" size="small" :color="statusColor(user.subscription.status)" variant="tonal">
                {{ statusLabel(user.subscription.status) }}
              </v-chip>
              <span v-else class="text-caption text-medium-emphasis">{{ t('admin.noSubscription') }}</span>
            </div>
            <div class="d-flex align-center justify-space-between mt-1">
              <v-switch
                :model-value="user.isActive"
                color="success"
                density="compact"
                hide-details
                :disabled="!canAdminister"
                :label="user.isActive ? t('admin.accountActive') : t('admin.accountInactive')"
                @update:model-value="(value) => toggleUserStatus(user, value)"
              />
              <v-menu>
                <template #activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" icon="mdi-dots-vertical" size="small" variant="text" :aria-label="t('admin.actions')" />
                </template>
                <v-list density="compact">
                  <v-list-item prepend-icon="mdi-logout" :title="t('admin.support.revokeSessions')" @click="askSupport(user, 'sessions')" />
                  <v-list-item prepend-icon="mdi-email-check-outline" :title="t('admin.support.resendVerification')" @click="askSupport(user, 'verification')" />
                  <template v-if="canAdminister">
                    <v-list-item prepend-icon="mdi-shield-off-outline" :title="t('admin.support.resetTwoFactor')" @click="askSupport(user, 'twoFactor')" />
                    <v-list-item
                      prepend-icon="mdi-crown-outline"
                      :title="user.role === 'admin' ? t('admin.removeAdmin') : t('admin.makeAdmin')"
                      @click="askSupport(user, 'role')"
                    />
                    <v-list-item
                      v-if="user.role !== 'admin'"
                      prepend-icon="mdi-lifebuoy"
                      :title="user.role === 'support' ? t('admin.support.removeSupport') : t('admin.support.makeSupport')"
                      @click="toggleSupportRole(user)"
                    />
                  </template>
                </v-list>
              </v-menu>
            </div>
          </div>
          <div v-if="!admin.loading && admin.users.length === 0" class="text-center text-medium-emphasis py-6">{{ t('admin.noUsersFound') }}</div>
        </div>

        <v-card v-else>
          <v-table>
            <thead>
              <tr>
                <th>{{ t('admin.user') }}</th>
                <th>{{ t('admin.role') }}</th>
                <th>{{ t('nav.subscription') }}</th>
                <th>{{ t('admin.accountStatus') }}</th>
                <th class="text-right">{{ t('admin.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in admin.users" :key="user._id">
                <td>
                  <div class="font-weight-medium">{{ user.name }}</div>
                  <div class="text-caption text-medium-emphasis" :title="user.email">{{ user.email }}</div>
                  <div class="text-caption text-medium-emphasis">{{ usageMeta(user) }}</div>
                </td>
                <td>
                  <v-chip size="small" :color="user.role === 'user' ? 'default' : 'primary'" variant="tonal">
                    {{ roleLabel(user.role) }}
                  </v-chip>
                </td>
                <td>
                  <v-chip v-if="user.subscription" size="small" :color="statusColor(user.subscription.status)" variant="tonal">
                    {{ statusLabel(user.subscription.status) }}
                  </v-chip>
                  <span v-else class="text-caption text-medium-emphasis">{{ t('admin.noSubscription') }}</span>
                </td>
                <td>
                  <v-switch
                    :model-value="user.isActive"
                    color="success"
                    density="compact"
                    hide-details
                    :disabled="!canAdminister"
                    :label="user.isActive ? t('admin.accountActive') : t('admin.accountInactive')"
                    @update:model-value="(value) => toggleUserStatus(user, value)"
                  />
                </td>
                <td class="text-right">
                  <v-menu>
                    <template #activator="{ props: menuProps }">
                      <v-btn v-bind="menuProps" icon="mdi-dots-vertical" size="small" variant="text" :aria-label="t('admin.actions')" />
                    </template>
                    <v-list density="compact">
                      <v-list-item prepend-icon="mdi-logout" :title="t('admin.support.revokeSessions')" @click="askSupport(user, 'sessions')" />
                      <v-list-item prepend-icon="mdi-email-check-outline" :title="t('admin.support.resendVerification')" @click="askSupport(user, 'verification')" />
                      <template v-if="canAdminister">
                        <v-list-item prepend-icon="mdi-shield-off-outline" :title="t('admin.support.resetTwoFactor')" @click="askSupport(user, 'twoFactor')" />
                        <v-list-item
                          prepend-icon="mdi-crown-outline"
                          :title="user.role === 'admin' ? t('admin.removeAdmin') : t('admin.makeAdmin')"
                          @click="askSupport(user, 'role')"
                        />
                        <v-list-item
                          v-if="user.role !== 'admin'"
                          prepend-icon="mdi-lifebuoy"
                          :title="user.role === 'support' ? t('admin.support.removeSupport') : t('admin.support.makeSupport')"
                          @click="toggleSupportRole(user)"
                        />
                      </template>
                    </v-list>
                  </v-menu>
                </td>
              </tr>
              <tr v-if="!admin.loading && admin.users.length === 0">
                <td colspan="5" class="text-center text-medium-emphasis py-6">{{ t('admin.noUsersFound') }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>

        <div class="d-flex justify-center mt-4" v-if="admin.usersMeta.totalPages > 1">
          <v-pagination
            :model-value="admin.usersMeta.page"
            :length="admin.usersMeta.totalPages"
            density="comfortable"
            :total-visible="isMobile ? 5 : 7"
            @update:model-value="loadUsers"
          />
        </div>
      </v-window-item>

      <v-window-item value="stats">
        <AdminStats v-if="tab === 'stats'" />
      </v-window-item>

      <v-window-item value="tools">
        <AdminTools v-if="tab === 'tools'" />
      </v-window-item>

      <v-window-item value="audit">
        <AdminAuditLog />
      </v-window-item>

      <v-window-item value="subscriptions">
        <div class="d-flex flex-wrap ga-3 mb-4">
          <v-text-field
            v-model="subscriptionFilters.q"
            :label="t('admin.searchByNameOrEmail')"
            prepend-inner-icon="mdi-magnify"
            density="compact"
            hide-details
            :style="isMobile ? 'flex: 1 1 100%' : 'max-width: 280px'"
            @keyup.enter="loadSubscriptions(1)"
          />
          <v-select
            v-model="subscriptionFilters.status"
            :items="[{ title: t('admin.all'), value: '' }, ...subscriptionStatuses.map((s) => ({ title: statusLabel(s), value: s }))]"
            :label="t('subscription.status')"
            density="compact"
            hide-details
            :style="isMobile ? 'flex: 1 1 50%' : 'max-width: 200px'"
            @update:model-value="loadSubscriptions(1)"
          />
          <v-btn variant="tonal" prepend-icon="mdi-magnify" @click="loadSubscriptions(1)">{{ t('common.search') }}</v-btn>
        </div>

        <div v-if="isMobile">
          <div v-for="sub in admin.subscriptions" :key="sub.id" class="kf-row">
            <v-avatar size="40" class="kf-avatar admin-avatar" :style="{ '--avatar-bg': avatarColor(sub.user?.name) }">{{ (sub.user?.name || '?').trim()[0]?.toUpperCase() }}</v-avatar>
            <div class="kf-row__body">
              <div class="kf-row__title">{{ sub.user?.name }}</div>
              <div class="kf-row__meta">{{ sub.user?.email }}</div>
              <div class="d-flex align-center flex-wrap ga-2 mt-1">
                <v-chip size="x-small" :color="statusColor(sub.status)" variant="tonal">{{ statusLabel(sub.status) }}</v-chip>
                <span v-if="sub.trialEndsAt" class="text-caption text-medium-emphasis">{{ t('admin.trialEnds') }}: {{ formatDate(sub.trialEndsAt) }}</span>
              </div>
            </div>
            <v-btn v-if="canAdminister" size="small" variant="text" icon="mdi-pencil" :aria-label="t('common.edit')" @click="openEdit(sub)" />
          </div>
          <div v-if="!admin.loading && admin.subscriptions.length === 0" class="text-center text-medium-emphasis py-6">{{ t('admin.noSubscriptionsFound') }}</div>
        </div>

        <v-card v-else>
          <v-table>
            <thead>
              <tr>
                <th>{{ t('admin.user') }}</th>
                <th>{{ t('subscription.status') }}</th>
                <th>{{ t('admin.trialEnds') }}</th>
                <th>{{ t('admin.periodEnd') }}</th>
                <th>{{ t('admin.provider') }}</th>
                <th class="text-right">{{ t('admin.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sub in admin.subscriptions" :key="sub.id">
                <td>
                  <div class="font-weight-medium">{{ sub.user?.name }}</div>
                  <div class="text-caption text-medium-emphasis">{{ sub.user?.email }}</div>
                </td>
                <td>
                  <v-chip size="small" :color="statusColor(sub.status)" variant="tonal">{{ statusLabel(sub.status) }}</v-chip>
                </td>
                <td>{{ formatDate(sub.trialEndsAt) }}</td>
                <td>{{ formatDate(sub.currentPeriodEnd) }}</td>
                <td class="text-capitalize">{{ sub.provider || '—' }}</td>
                <td class="text-right">
                  <v-btn v-if="canAdminister" size="small" variant="text" icon="mdi-pencil" :aria-label="t('common.edit')" @click="openEdit(sub)" />
                </td>
              </tr>
              <tr v-if="!admin.loading && admin.subscriptions.length === 0">
                <td colspan="6" class="text-center text-medium-emphasis py-6">{{ t('admin.noSubscriptionsFound') }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>

        <div class="d-flex justify-center mt-4" v-if="admin.subscriptionsMeta.totalPages > 1">
          <v-pagination
            :model-value="admin.subscriptionsMeta.page"
            :length="admin.subscriptionsMeta.totalPages"
            density="comfortable"
            :total-visible="isMobile ? 5 : 7"
            @update:model-value="loadSubscriptions"
          />
        </div>
      </v-window-item>
    </v-window>

    <ConfirmDialog
      v-model="supportDialog"
      :title="supportCopy.title"
      :message="supportCopy.message"
      :confirm-label="t('admin.support.confirm')"
      :loading="supportBusy"
      @confirm="runSupport"
    />

    <v-dialog v-model="editDialog" max-width="480">
      <v-card :title="t('admin.adjustSubscription')" class="capture-form">
        <v-card-text>
          <NativeSelectField v-model="editForm.status" :items="subscriptionStatuses.map((s) => ({ title: statusLabel(s), value: s }))" :label="t('subscription.status')" required class="mb-2" />
          <v-text-field v-model="editForm.statusReason" :label="t('admin.reasonOptional')" variant="outlined" density="compact" class="mb-3" />
          <v-row dense>
            <v-col cols="6"><v-text-field v-model="editForm.trialEndsAt" :label="t('admin.trialEnds')" type="date" variant="outlined" density="compact" /></v-col>
            <v-col cols="6"><v-text-field v-model="editForm.currentPeriodEnd" :label="t('admin.currentPeriodEnd')" type="date" variant="outlined" density="compact" /></v-col>
          </v-row>
          <v-switch v-model="editForm.cancelAtPeriodEnd" :label="t('admin.cancelAtPeriodEnd')" density="compact" hide-details class="mt-2" />
        </v-card-text>
        <v-card-actions class="form-actions">
          <v-btn variant="text" @click="editDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-spacer />
          <v-btn class="form-actions__primary" :loading="saving" @click="saveEdit">{{ t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, defineAsyncComponent } from 'vue'
import { useDisplay } from 'vuetify'
import KfSegmented from '@/components/ui/KfSegmented.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import AdminAuditLog from '@/components/AdminAuditLog.vue'
// Las gráficas y herramientas solo se descargan al abrir su pestaña.
const AdminStats = defineAsyncComponent(() => import('@/components/admin/AdminStats.vue'))
const AdminTools = defineAsyncComponent(() => import('@/components/admin/AdminTools.vue'))
import { adminAPI } from '@/api'
import KpiCard from '@/components/finance/KpiCard.vue'
import { useI18n } from 'vue-i18n'
import { useAdminStore } from '@/stores/admin'
import { useSnackbar } from '@/stores/snackbar'
import { useAuthStore } from '@/stores/auth'
import { useLocale } from '@/composables/useLocale'
import NativeSelectField from '@/components/NativeSelectField.vue'

const { t } = useI18n()
const { date } = useLocale()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const tabOptions = computed(() => [
  { value: 'overview', label: t('admin.overview') },
  { value: 'users', label: t('admin.users') },
  { value: 'subscriptions', label: t('admin.subscriptions') },
  { value: 'stats', label: t('admin.stats.tab') },
  { value: 'tools', label: t('admin.tools.tab') },
  ...(authStore.isAdmin ? [{ value: 'audit', label: t('admin.audit.tab') }] : []),
])
const statusShare = (status) => {
  const total = Object.values(admin.overview?.subscriptions?.byStatus || {}).reduce((sum, n) => sum + (Number(n) || 0), 0)
  return total ? Math.round(((admin.overview.subscriptions.byStatus[status] || 0) / total) * 100) : 0
}
// Stable avatar tint per user name (presentation only).
const AVATAR_TINTS = ['#1f8fa8', '#7b5bd6', '#c48a3a', '#2a9d8f', '#c45b8a', '#4b7bd6']
const avatarColor = (name = '') => AVATAR_TINTS[[...String(name)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_TINTS.length]

const admin = useAdminStore()
const snackbar = useSnackbar()
const authStore = useAuthStore()

const tab = ref('overview')

const userFilters = ref({ q: '', status: '', role: '', platform: '', inactiveDays: '' })
const subscriptionFilters = ref({ q: '', status: '' })

const statusFilterOptions = computed(() => [
  { title: t('admin.all'), value: '' },
  { title: t('admin.active'), value: 'active' },
  { title: t('admin.inactive'), value: 'inactive' },
])
const roleFilterOptions = computed(() => [
  { title: t('admin.all'), value: '' },
  { title: t('admin.users'), value: 'user' },
  { title: t('admin.admins'), value: 'admin' },
])
const subscriptionStatuses = ['trialing', 'active', 'past_due', 'canceled', 'expired', 'exempt', 'incomplete']

const statusLabel = (status) => ({
  trialing: t('admin.subStatusTrial'),
  active: t('admin.subStatusActive'),
  past_due: t('admin.subStatusPastDue'),
  canceled: t('admin.subStatusCanceled'),
  expired: t('admin.subStatusExpired'),
  exempt: t('admin.subStatusExempt'),
  incomplete: t('admin.subStatusIncomplete'),
}[status] || status)

const statusColor = (status) => ({
  trialing: 'info',
  active: 'success',
  past_due: 'warning',
  canceled: 'warning',
  expired: 'error',
  exempt: 'success',
  incomplete: 'warning',
}[status] || 'default')

const formatDate = (value) => {
  if (!value) return '—'
  return date(value, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const platformFilterOptions = computed(() => [
  { title: t('admin.all'), value: '' },
  ...['android', 'ios', 'pwa', 'web', 'unknown'].map((p) => ({ title: t(`admin.stats.platform.${p}`), value: p })),
])
const inactiveFilterOptions = computed(() => [
  { title: t('admin.all'), value: '' },
  { title: t('admin.inactiveDays', { n: 7 }), value: 7 },
  { title: t('admin.inactiveDays', { n: 30 }), value: 30 },
  { title: t('admin.inactiveDays', { n: 90 }), value: 90 },
])
const usageMeta = (user) => {
  const known = user.lastPlatform && user.lastPlatform !== 'unknown'
  const platform = known ? t(`admin.stats.platform.${user.lastPlatform}`) : t('admin.unknownPlatform')
  const seen = user.lastActiveAt ? date(user.lastActiveAt) : t('admin.neverSeen')
  return `${platform}${user.lastAppVersion ? ` ${user.lastAppVersion}` : ''} · ${seen}`
}

const exporting = ref(false)
const exportUsers = async () => {
  exporting.value = true
  try {
    const res = await adminAPI.exportUsers({ ...userFilters.value })
    const url = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = url
    link.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    snackbar.error(error?.response?.data?.message || t('common.loadError'))
  }
  exporting.value = false
}

const loadUsers = (page = 1) => admin.fetchUsers({ ...userFilters.value, page })
const loadSubscriptions = (page = 1) => admin.fetchSubscriptions({ ...subscriptionFilters.value, page })

const toggleUserStatus = async (user, value) => {
  if (user._id === authStore.user?._id && !value) {
    snackbar.error(t('admin.cannotDeactivateSelf'))
    return
  }
  const result = await admin.setUserStatus(user._id, value)
  if (result.success) snackbar.success(value ? t('admin.userActivated') : t('admin.userDeactivated'))
  else snackbar.error(result.message)
}

// Granting or removing administrator rights always goes through the confirmation dialog
// (askSupport(user, 'role')), which names the person affected.
const toggleUserRole = async (user) => {
  const nextRole = user.role === 'admin' ? 'user' : 'admin'
  const result = await admin.setUserRole(user._id, nextRole)
  if (result.success) snackbar.success(nextRole === 'admin' ? t('admin.nowAdmin') : t('admin.adminRoleRemoved'))
  else snackbar.error(result.message)
  return result.success
}

const canAdminister = computed(() => authStore.isAdmin)
const roleLabel = (role) => ({ admin: t('admin.administrator'), support: t('admin.support.role') }[role] || t('admin.user'))

const supportDialog = ref(false)
const supportBusy = ref(false)
const supportUser = ref(null)
const supportAction = ref('sessions')

const supportCopy = computed(() => {
  const email = supportUser.value?.email
  if (supportAction.value === 'role') {
    const isAdmin = supportUser.value?.role === 'admin'
    const name = supportUser.value?.name
    return isAdmin
      ? { title: t('admin.removeAdmin'), message: t('admin.support.removeAdminConfirm', { name, email }) }
      : { title: t('admin.makeAdmin'), message: t('admin.support.makeAdminConfirm', { name, email }) }
  }
  if (supportAction.value === 'sessions') return { title: t('admin.support.revokeSessions'), message: t('admin.support.revokeSessionsConfirm', { email }) }
  if (supportAction.value === 'verification') return { title: t('admin.support.resendVerification'), message: t('admin.support.resendVerificationConfirm', { email }) }
  return { title: t('admin.support.resetTwoFactor'), message: t('admin.support.resetTwoFactorConfirm', { email }) }
})

const toggleSupportRole = async (user) => {
  const nextRole = user.role === 'support' ? 'user' : 'support'
  const result = await admin.setUserRole(user._id, nextRole)
  if (result.success) snackbar.success(t('admin.support.roleUpdated'))
  else snackbar.error(result.message)
}

const askSupport = (user, action) => {
  supportUser.value = user
  supportAction.value = action
  supportDialog.value = true
}

const runSupport = async () => {
  supportBusy.value = true
  try {
    const id = supportUser.value._id
    if (supportAction.value === 'role') {
      if (await toggleUserRole(supportUser.value)) supportDialog.value = false
      supportBusy.value = false
      return
    }
    if (supportAction.value === 'sessions') await adminAPI.revokeUserSessions(id)
    else if (supportAction.value === 'verification') await adminAPI.resendUserVerification(id)
    else await adminAPI.resetUserTwoFactor(id)
    snackbar.success(t('admin.support.done'))
    supportDialog.value = false
  } catch (e) {
    snackbar.error(e.response?.data?.message || t('common.error'))
  }
  supportBusy.value = false
}

const editDialog = ref(false)
const saving = ref(false)
const editingId = ref(null)
const editForm = ref({ status: '', statusReason: '', trialEndsAt: '', currentPeriodEnd: '', cancelAtPeriodEnd: false })

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '')

const openEdit = (sub) => {
  editingId.value = sub.id
  editForm.value = {
    status: sub.status,
    statusReason: sub.statusReason || '',
    trialEndsAt: toDateInput(sub.trialEndsAt),
    currentPeriodEnd: toDateInput(sub.currentPeriodEnd),
    cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
  }
  editDialog.value = true
}

const saveEdit = async () => {
  saving.value = true
  const payload = {
    status: editForm.value.status,
    statusReason: editForm.value.statusReason,
    cancelAtPeriodEnd: editForm.value.cancelAtPeriodEnd,
    trialEndsAt: editForm.value.trialEndsAt || undefined,
    currentPeriodEnd: editForm.value.currentPeriodEnd || null,
  }
  const result = await admin.updateSubscription(editingId.value, payload)
  saving.value = false
  if (result.success) {
    snackbar.success(t('admin.subscriptionUpdated'))
    editDialog.value = false
    loadSubscriptions(admin.subscriptionsMeta.page)
  } else {
    snackbar.error(result.message)
  }
}

onMounted(async () => {
  await admin.fetchOverview()
  await loadUsers(1)
  await loadSubscriptions(1)
})
</script>

<style scoped>
.admin-card__title { padding: 18px 18px 6px !important; }
/* Tiles share each row evenly, so seven states never leave one alone on the last line. */
.status-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.status-grid > .status-tile { flex: 1 1 190px; }
/* A long e-mail wraps on phones instead of hiding its domain. */
.admin-row__email { white-space: normal; overflow-wrap: anywhere; }
.status-tile { padding: 12px; border: 1px solid var(--kf-border-subtle); border-radius: var(--kf-radius-sm); background: rgba(4, 22, 31, 0.35); }
.status-tile__label { color: var(--kf-text-secondary); font-size: 0.82rem; }
.status-tile__count { font-size: 1.1rem; }
.admin-row { display: block; }
/* The label next to the account switch stays on one line in the users table. */
:deep(.v-switch .v-label) { white-space: nowrap; }
:deep(.v-switch .v-selection-control) { flex-wrap: nowrap; }
.kf-avatar.admin-avatar { border: 0; background: var(--avatar-bg) !important; color: #fff !important; }
.admin-row__main { display: flex; align-items: center; gap: 12px; }
</style>
