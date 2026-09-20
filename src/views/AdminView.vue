<template>
  <div>
    <div class="page-intro">
      <div class="page-intro__eyebrow">Administración</div>
      <h1 :class="isMobile ? 'text-h5' : 'text-h4'">Panel administrativo</h1>
      <p class="page-intro__subtitle">Revisa usuarios, suscripciones y realiza ajustes administrativos.</p>
    </div>

    <v-alert v-if="admin.error" type="error" variant="tonal" closable class="mb-5">
      {{ admin.error }}
    </v-alert>

    <v-tabs v-model="tab" class="mb-5">
      <v-tab value="overview">Resumen</v-tab>
      <v-tab value="users">Usuarios</v-tab>
      <v-tab value="subscriptions">Suscripciones</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="overview">
        <v-row v-if="admin.overview">
          <v-col cols="6" md="3">
            <v-card class="pa-4">
              <div class="text-caption text-medium-emphasis">Usuarios totales</div>
              <div class="text-h4 font-weight-bold">{{ admin.overview.users.total }}</div>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card class="pa-4">
              <div class="text-caption text-medium-emphasis">Usuarios activos</div>
              <div class="text-h4 font-weight-bold text-success">{{ admin.overview.users.active }}</div>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card class="pa-4">
              <div class="text-caption text-medium-emphasis">Usuarios desactivados</div>
              <div class="text-h4 font-weight-bold text-error">{{ admin.overview.users.inactive }}</div>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card class="pa-4">
              <div class="text-caption text-medium-emphasis">Administradores</div>
              <div class="text-h4 font-weight-bold">{{ admin.overview.users.admins }}</div>
            </v-card>
          </v-col>
        </v-row>

        <v-card v-if="admin.overview" class="mt-5">
          <v-card-title>Suscripciones por estado</v-card-title>
          <v-card-text>
            <div class="d-flex flex-wrap ga-3">
              <v-chip
                v-for="status in subscriptionStatuses"
                :key="status"
                :color="statusColor(status)"
                variant="tonal"
              >
                {{ statusLabel(status) }}: {{ admin.overview.subscriptions.byStatus[status] || 0 }}
              </v-chip>
            </div>
            <div class="text-body-2 text-medium-emphasis mt-4">
              Con acceso activo (trial, activa o cortesía): <strong>{{ admin.overview.subscriptions.activeEntitled }}</strong>
            </div>
          </v-card-text>
        </v-card>
      </v-window-item>

      <v-window-item value="users">
        <div class="d-flex flex-wrap ga-3 mb-4">
          <v-text-field
            v-model="userFilters.q"
            label="Buscar por nombre o correo"
            density="compact"
            hide-details
            style="max-width: 280px"
            @keyup.enter="loadUsers(1)"
          />
          <v-select
            v-model="userFilters.status"
            :items="statusFilterOptions"
            label="Estado"
            density="compact"
            hide-details
            style="max-width: 180px"
            @update:model-value="loadUsers(1)"
          />
          <v-select
            v-model="userFilters.role"
            :items="roleFilterOptions"
            label="Rol"
            density="compact"
            hide-details
            style="max-width: 180px"
            @update:model-value="loadUsers(1)"
          />
          <v-btn variant="tonal" prepend-icon="mdi-magnify" @click="loadUsers(1)">Buscar</v-btn>
        </div>

        <v-card>
          <v-table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Suscripción</th>
                <th>Estado cuenta</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in admin.users" :key="user._id">
                <td>
                  <div class="font-weight-medium">{{ user.name }}</div>
                  <div class="text-caption text-medium-emphasis">{{ user.email }}</div>
                </td>
                <td>
                  <v-chip size="small" :color="user.role === 'admin' ? 'primary' : 'default'" variant="tonal">
                    {{ user.role === 'admin' ? 'Administrador' : 'Usuario' }}
                  </v-chip>
                </td>
                <td>
                  <v-chip v-if="user.subscription" size="small" :color="statusColor(user.subscription.status)" variant="tonal">
                    {{ statusLabel(user.subscription.status) }}
                  </v-chip>
                  <span v-else class="text-caption text-medium-emphasis">Sin suscripción</span>
                </td>
                <td>
                  <v-switch
                    :model-value="user.isActive"
                    color="success"
                    density="compact"
                    hide-details
                    :label="user.isActive ? 'Activo' : 'Inactivo'"
                    @update:model-value="(value) => toggleUserStatus(user, value)"
                  />
                </td>
                <td class="text-right">
                  <v-btn
                    size="small"
                    variant="text"
                    @click="toggleUserRole(user)"
                  >
                    {{ user.role === 'admin' ? 'Quitar admin' : 'Hacer admin' }}
                  </v-btn>
                </td>
              </tr>
              <tr v-if="!admin.loading && admin.users.length === 0">
                <td colspan="5" class="text-center text-medium-emphasis py-6">No se encontraron usuarios</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>

        <div class="d-flex justify-center mt-4" v-if="admin.usersMeta.totalPages > 1">
          <v-pagination
            :model-value="admin.usersMeta.page"
            :length="admin.usersMeta.totalPages"
            density="comfortable"
            @update:model-value="loadUsers"
          />
        </div>
      </v-window-item>

      <v-window-item value="subscriptions">
        <div class="d-flex flex-wrap ga-3 mb-4">
          <v-text-field
            v-model="subscriptionFilters.q"
            label="Buscar por nombre o correo"
            density="compact"
            hide-details
            style="max-width: 280px"
            @keyup.enter="loadSubscriptions(1)"
          />
          <v-select
            v-model="subscriptionFilters.status"
            :items="[{ title: 'Todos', value: '' }, ...subscriptionStatuses.map((s) => ({ title: statusLabel(s), value: s }))]"
            label="Estado"
            density="compact"
            hide-details
            style="max-width: 200px"
            @update:model-value="loadSubscriptions(1)"
          />
          <v-btn variant="tonal" prepend-icon="mdi-magnify" @click="loadSubscriptions(1)">Buscar</v-btn>
        </div>

        <v-card>
          <v-table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Estado</th>
                <th>Vence prueba</th>
                <th>Fin periodo</th>
                <th>Proveedor</th>
                <th class="text-right">Acciones</th>
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
                  <v-btn size="small" variant="text" icon="mdi-pencil" @click="openEdit(sub)" />
                </td>
              </tr>
              <tr v-if="!admin.loading && admin.subscriptions.length === 0">
                <td colspan="6" class="text-center text-medium-emphasis py-6">No se encontraron suscripciones</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>

        <div class="d-flex justify-center mt-4" v-if="admin.subscriptionsMeta.totalPages > 1">
          <v-pagination
            :model-value="admin.subscriptionsMeta.page"
            :length="admin.subscriptionsMeta.totalPages"
            density="comfortable"
            @update:model-value="loadSubscriptions"
          />
        </div>
      </v-window-item>
    </v-window>

    <v-dialog v-model="editDialog" max-width="480">
      <v-card title="Ajustar suscripción" class="capture-form">
        <v-card-text>
          <NativeSelectField v-model="editForm.status" :items="subscriptionStatuses.map((s) => ({ title: statusLabel(s), value: s }))" label="Estado" required class="mb-2" />
          <v-text-field v-model="editForm.statusReason" label="Motivo (opcional)" variant="outlined" density="compact" class="mb-3" />
          <v-row dense>
            <v-col cols="6"><v-text-field v-model="editForm.trialEndsAt" label="Vence prueba" type="date" variant="outlined" density="compact" /></v-col>
            <v-col cols="6"><v-text-field v-model="editForm.currentPeriodEnd" label="Fin de periodo actual" type="date" variant="outlined" density="compact" /></v-col>
          </v-row>
          <v-switch v-model="editForm.cancelAtPeriodEnd" label="Cancelar al finalizar el periodo" density="compact" hide-details class="mt-2" />
        </v-card-text>
        <v-card-actions class="form-actions">
          <v-btn variant="text" @click="editDialog = false">Cancelar</v-btn>
          <v-spacer />
          <v-btn class="form-actions__primary" :loading="saving" @click="saveEdit">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useAdminStore } from '@/stores/admin'
import { useSnackbar } from '@/stores/snackbar'
import { useAuthStore } from '@/stores/auth'
import NativeSelectField from '@/components/NativeSelectField.vue'

const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)

const admin = useAdminStore()
const snackbar = useSnackbar()
const authStore = useAuthStore()

const tab = ref('overview')

const userFilters = ref({ q: '', status: '', role: '' })
const subscriptionFilters = ref({ q: '', status: '' })

const statusFilterOptions = [
  { title: 'Todos', value: '' },
  { title: 'Activos', value: 'active' },
  { title: 'Inactivos', value: 'inactive' },
]
const roleFilterOptions = [
  { title: 'Todos', value: '' },
  { title: 'Usuarios', value: 'user' },
  { title: 'Administradores', value: 'admin' },
]
const subscriptionStatuses = ['trialing', 'active', 'past_due', 'canceled', 'expired', 'exempt', 'incomplete']

const statusLabel = (status) => ({
  trialing: 'Prueba',
  active: 'Activa',
  past_due: 'Pago pendiente',
  canceled: 'Cancelada',
  expired: 'Vencida',
  exempt: 'Cortesía',
  incomplete: 'Incompleta',
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
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
}

const loadUsers = (page = 1) => admin.fetchUsers({ ...userFilters.value, page })
const loadSubscriptions = (page = 1) => admin.fetchSubscriptions({ ...subscriptionFilters.value, page })

const toggleUserStatus = async (user, value) => {
  if (user._id === authStore.user?._id && !value) {
    snackbar.error('No puedes desactivar tu propia cuenta')
    return
  }
  const result = await admin.setUserStatus(user._id, value)
  if (result.success) snackbar.success(value ? 'Usuario activado' : 'Usuario desactivado')
  else snackbar.error(result.message)
}

const toggleUserRole = async (user) => {
  const nextRole = user.role === 'admin' ? 'user' : 'admin'
  const result = await admin.setUserRole(user._id, nextRole)
  if (result.success) snackbar.success(nextRole === 'admin' ? 'Ahora es administrador' : 'Se quitó el rol de administrador')
  else snackbar.error(result.message)
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
    snackbar.success('Suscripción actualizada')
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
