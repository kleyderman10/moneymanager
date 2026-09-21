<template>
  <div>
    <div class="page-intro">
      <div class="page-intro__eyebrow">Tu cuenta</div>
      <h1 :class="isMobile ? 'text-h5' : 'text-h4'">Perfil y seguridad</h1>
      <p class="page-intro__subtitle">Administra tus datos, moneda preferida y métodos de acceso.</p>
    </div>

    <v-row>
      <v-col cols="12" md="6">
        <v-card title="Información personal">
          <v-card-text>
            <v-form @submit.prevent="saveProfile">
              <v-text-field v-model="profileForm.name" label="Nombre" variant="outlined" density="compact" required class="mb-3" />
              <v-text-field :model-value="authStore.user?.email" label="Email" variant="outlined" density="compact" disabled class="mb-3" />
              <v-chip color="success" variant="tonal" size="small" prepend-icon="mdi-email-check-outline" class="mb-4">
                Correo verificado
              </v-chip>
              <v-text-field v-model="profileForm.currency" label="Moneda preferida" variant="outlined" density="compact" class="mb-3" />
              <v-btn type="submit" class="form-actions__primary" :loading="profileLoading" block>Guardar cambios</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card title="Cambiar contraseña">
          <v-card-text>
            <v-alert v-if="passMsg" :type="passSuccess ? 'success' : 'error'" density="compact" class="mb-2">{{ passMsg }}</v-alert>
            <v-form @submit.prevent="savePassword">
              <v-text-field v-model="passForm.currentPassword" label="Contraseña actual" type="password" variant="outlined" density="compact" required class="mb-3" />
              <v-text-field
                v-model="passForm.newPassword"
                label="Nueva contraseña"
                type="password"
                variant="outlined"
                density="compact"
                hint="Entre 10 y 72 caracteres"
                :rules="[passwordRule]"
                required
                class="mb-3"
              />
              <v-btn type="submit" class="form-actions__primary" :loading="passLoading" block>Actualizar contraseña</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card title="Verificación en dos pasos">
          <v-card-text>
            <template v-if="!twoFactorMode">
              <v-alert
                :type="authStore.user?.twoFactorEnabled ? 'success' : 'info'"
                density="compact"
                variant="tonal"
                class="mb-3"
                :icon="authStore.user?.twoFactorEnabled ? 'mdi-shield-check' : 'mdi-shield-outline'"
              >
                {{ authStore.user?.twoFactorEnabled
                  ? 'Activa. Cada acceso con contraseña requiere un código enviado a tu correo.'
                  : 'Añade un código de un solo uso después de tu contraseña.' }}
              </v-alert>
              <v-btn
                v-if="!authStore.user?.twoFactorEnabled"
                color="primary"
                block
                :loading="twoFactorLoading"
                prepend-icon="mdi-two-factor-authentication"
                @click="startTwoFactorSetup"
              >
                Activar verificación en dos pasos
              </v-btn>
              <v-btn v-else color="error" variant="outlined" block @click="twoFactorMode = 'disable'">
                Desactivar verificación en dos pasos
              </v-btn>
            </template>

            <template v-else-if="twoFactorMode === 'enable'">
              <p class="text-body-2 text-medium-emphasis mb-3">Escribe el código enviado a {{ authStore.user?.email }}.</p>
              <v-text-field
                v-model="twoFactorCode"
                label="Código de 6 dígitos"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                prepend-inner-icon="mdi-shield-key-outline"
                :rules="[codeRule]"
              />
              <v-btn color="primary" block :loading="twoFactorLoading" @click="confirmTwoFactorSetup">Confirmar y activar</v-btn>
              <v-btn variant="text" color="primary" block class="mt-2" :loading="twoFactorLoading" @click="startTwoFactorSetup">Reenviar código</v-btn>
              <v-btn variant="text" block @click="cancelTwoFactorChange">Cancelar</v-btn>
            </template>

            <template v-else>
              <p class="text-body-2 text-medium-emphasis mb-3">Confirma tu contraseña y el código enviado a tu correo.</p>
              <v-text-field
                v-model="disablePassword"
                label="Contraseña actual"
                type="password"
                autocomplete="current-password"
                prepend-inner-icon="mdi-lock-outline"
                required
              />
              <v-text-field
                v-if="disableCodeSent"
                v-model="twoFactorCode"
                label="Código de 6 dígitos"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                prepend-inner-icon="mdi-shield-key-outline"
                :rules="[codeRule]"
              />
              <v-btn
                :color="disableCodeSent ? 'error' : 'primary'"
                block
                :loading="twoFactorLoading"
                @click="disableCodeSent ? confirmTwoFactorDisable() : requestTwoFactorDisable()"
              >
                {{ disableCodeSent ? 'Confirmar y desactivar' : 'Enviar código de confirmación' }}
              </v-btn>
              <v-btn v-if="disableCodeSent" variant="text" color="primary" block class="mt-2" :loading="twoFactorLoading" @click="requestTwoFactorDisable">
                Reenviar código
              </v-btn>
              <v-btn variant="text" block @click="cancelTwoFactorChange">Cancelar</v-btn>
            </template>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card title="Plan y facturación">
          <v-card-text>
            <div class="d-flex align-center justify-space-between mb-3">
              <div>
                <div class="text-subtitle-1 font-weight-bold">Knexura Finanzas Personal</div>
                <div class="text-body-2 text-medium-emphasis">{{ formattedPlanPrice }} cada tres meses</div>
              </div>
              <v-chip :color="billingStatusColor" variant="tonal" size="small">
                {{ billingStatusLabel }}
              </v-chip>
            </div>
            <p class="text-body-2 text-medium-emphasis mb-4">{{ billingMessage }}</p>
            <v-btn color="primary" variant="outlined" block prepend-icon="mdi-credit-card-outline" to="/subscription">
              Administrar suscripción
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card title="Privacidad e inteligencia artificial">
          <v-card-text>
            <v-alert
              v-if="authStore.hasAcceptedAIConsent"
              type="success"
              density="compact"
              variant="tonal"
              class="mb-3"
              icon="mdi-shield-check"
            >
              Aceptaste que tus recibos, extractos y chat puedan enviarse a nuestro proveedor de IA (OpenAI / Google Gemini).
            </v-alert>
            <v-alert v-else type="info" density="compact" variant="tonal" class="mb-3">
              No has aceptado el uso de funciones de IA. Escanear recibos, subir extractos y el chat están deshabilitados.
            </v-alert>
            <v-btn color="primary" variant="outlined" block prepend-icon="mdi-robot-outline" @click="showConsentDialog = true">
              {{ authStore.hasAcceptedAIConsent ? 'Revisar o revocar permisos de IA' : 'Revisar permisos de IA' }}
            </v-btn>
            <v-btn
              variant="text"
              block
              class="mt-2"
              prepend-icon="mdi-shield-lock-outline"
              @click="openPrivacyPolicy"
            >
              Ver política de privacidad
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col v-if="biometricSupported" cols="12" md="6">
        <v-card title="Autenticación Biométrica">
          <v-card-text>
            <v-alert
              v-if="authStore.hasBiometric"
              type="success"
              density="compact"
              variant="tonal"
              class="mb-3"
              icon="mdi-shield-check"
            >
              Face ID / Huella activado
            </v-alert>
            <v-alert
              v-else
              type="info"
              density="compact"
              variant="tonal"
              class="mb-3"
            >
              Inicia sesión más rápido usando tu rostro o huella dactilar.
            </v-alert>
            <v-btn
              v-if="authStore.hasBiometric"
              color="error"
              variant="outlined"
              block
              :loading="bioLoading"
              @click="handleRemoveBiometric"
            >
              Desactivar Face ID / Huella
            </v-btn>
            <v-btn
              v-else
              color="primary"
              block
              :loading="bioLoading"
              prepend-icon="mdi-face-recognition"
              @click="handleRegisterBiometric"
            >
              Activar Face ID / Huella
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12">
        <v-card title="Eliminar cuenta" class="delete-account-card">
          <v-card-text>
            <p class="text-body-2 mb-3">
              Al eliminar tu cuenta borramos permanentemente tu perfil y todos tus datos:
              movimientos, cuentas, categorías, presupuestos, metas, créditos, extractos e
              historial de IA. Esta acción no se puede deshacer.
            </p>
            <v-alert type="warning" density="compact" variant="tonal" class="mb-3">
              Si tienes una suscripción activa, cancélala por separado antes de eliminar la
              cuenta: <template v-if="manageHint">se cancela desde {{ manageHint }}</template>
              <template v-else>gestiónala desde donde la contrataste</template>.
            </v-alert>
            <v-btn color="error" variant="outlined" prepend-icon="mdi-delete-forever-outline" @click="showDeleteDialog = true">
              Eliminar mi cuenta
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <AIConsentDialog
      :visible="showConsentDialog"
      @decline="showConsentDialog = false"
      @accept="showConsentDialog = false"
    />

    <v-dialog v-model="showDeleteDialog" max-width="480" persistent>
      <v-card title="Eliminar cuenta definitivamente">
        <v-card-text>
          <p class="text-body-2 mb-4">
            Se eliminarán tu cuenta y todos tus datos financieros de forma permanente.
            Escribe tu contraseña para confirmar.
          </p>
          <v-text-field
            v-model="deletePassword"
            label="Contraseña"
            type="password"
            variant="outlined"
            density="comfortable"
            autocomplete="current-password"
            :disabled="deleteLoading"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="deleteLoading" @click="closeDeleteDialog">Cancelar</v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="deleteLoading"
            :disabled="!deletePassword"
            @click="handleDeleteAccount"
          >
            Eliminar cuenta
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AIConsentDialog from '@/components/AIConsentDialog.vue'
import { useDisplay } from 'vuetify'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { useSnackbar } from '@/stores/snackbar'
import { openLegalLink, PRIVACY_POLICY_URL } from '@/utils/legalLinks'
import { storeManageHint } from '@/utils/nativeIAP'

const { mobile } = useDisplay()
const router = useRouter()
const isMobile = computed(() => mobile.value)
const authStore = useAuthStore()
const billingStore = useSubscriptionStore()
const snackbar = useSnackbar()

const profileForm = reactive({ name: authStore.user?.name, currency: authStore.user?.currency || 'USD' })
const profileLoading = ref(false)
const passForm = reactive({ currentPassword: '', newPassword: '' })
const passLoading = ref(false)
const passMsg = ref('')
const passSuccess = ref(false)
const biometricSupported = ref(false)
const bioLoading = ref(false)
const showConsentDialog = ref(false)
const manageHint = computed(() => storeManageHint())
const showDeleteDialog = ref(false)
const deletePassword = ref('')
const deleteLoading = ref(false)
const twoFactorMode = ref(null)
const twoFactorLoading = ref(false)
const twoFactorCode = ref('')
const disablePassword = ref('')
const disableCodeSent = ref(false)

const passwordRule = (value) => (
  value.length >= 10 && new TextEncoder().encode(value).length <= 72
) || 'Usa entre 10 y 72 caracteres'
const codeRule = (value) => /^\d{6}$/.test(value) || 'Ingresa los 6 dígitos'

const formattedPlanPrice = computed(() => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: billingStore.status?.plan?.currency || 'COP',
  maximumFractionDigits: 0,
}).format(billingStore.status?.plan?.amount || 15000))
const billingStatusLabel = computed(() => ({
  trialing: 'Prueba gratuita',
  active: 'Activa',
  past_due: 'Pago pendiente',
  canceled: 'Cancelada',
  incomplete: 'Registro pendiente',
  expired: 'Vencida',
  exempt: 'Cortesía',
}[billingStore.status?.status] || 'Consultando'))
const billingStatusColor = computed(() => ({
  active: 'success',
  trialing: 'info',
  past_due: 'warning',
  canceled: 'warning',
  incomplete: 'warning',
  expired: 'error',
  exempt: 'success',
}[billingStore.status?.status] || 'default'))
const billingMessage = computed(() => {
  if (billingStore.status?.status === 'trialing') {
    return `Te quedan ${billingStore.status.daysRemaining} días de prueba gratuita.`
  }
  if (billingStore.status?.status === 'active') return 'Tu suscripción está al día.'
  if (billingStore.status?.status === 'canceled') return 'Conservarás acceso hasta terminar el periodo pagado.'
  if (billingStore.status?.requiresSubscription) return 'Actualiza tu suscripción para recuperar el acceso completo.'
  return 'Consulta los detalles y el historial de cobros de tu plan.'
})

const saveProfile = async () => {
  profileLoading.value = true
  try {
    await authStore.updateProfile({ name: profileForm.name, currency: profileForm.currency })
    snackbar.success('Perfil actualizado')
  } catch { snackbar.error('Error al actualizar') }
  profileLoading.value = false
}

const savePassword = async () => {
  passLoading.value = true; passMsg.value = ''
  const result = await authStore.changePassword({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword })
  passLoading.value = false; passSuccess.value = result.success
  passMsg.value = result.success ? result.message : result.message
  if (result.success) {
    passForm.currentPassword = ''; passForm.newPassword = ''
    snackbar.success(result.message)
    await authStore.logout(false)
    router.push('/login')
  }
}

const openPrivacyPolicy = () => openLegalLink(PRIVACY_POLICY_URL)

const closeDeleteDialog = () => {
  showDeleteDialog.value = false
  deletePassword.value = ''
}

const handleDeleteAccount = async () => {
  deleteLoading.value = true
  const result = await authStore.deleteAccount(deletePassword.value)
  deleteLoading.value = false
  if (!result.success) return snackbar.error(result.message)
  closeDeleteDialog()
  snackbar.success('Tu cuenta y todos tus datos fueron eliminados.')
  router.push('/login')
}

const startTwoFactorSetup = async () => {
  twoFactorLoading.value = true
  const result = await authStore.requestTwoFactorSetup()
  twoFactorLoading.value = false
  if (result.success) {
    twoFactorMode.value = 'enable'
    snackbar.success(result.message)
  } else snackbar.error(result.message)
}

const confirmTwoFactorSetup = async () => {
  twoFactorLoading.value = true
  const result = await authStore.confirmTwoFactorSetup(twoFactorCode.value)
  twoFactorLoading.value = false
  if (result.success) {
    cancelTwoFactorChange()
    snackbar.success('Verificación en dos pasos activada')
  } else snackbar.error(result.message)
}

const requestTwoFactorDisable = async () => {
  twoFactorLoading.value = true
  const result = await authStore.requestTwoFactorDisable(disablePassword.value)
  twoFactorLoading.value = false
  if (result.success) {
    disableCodeSent.value = true
    snackbar.success(result.message)
  } else snackbar.error(result.message)
}

const confirmTwoFactorDisable = async () => {
  twoFactorLoading.value = true
  const result = await authStore.disableTwoFactor(disablePassword.value, twoFactorCode.value)
  twoFactorLoading.value = false
  if (result.success) {
    cancelTwoFactorChange()
    snackbar.success('Verificación en dos pasos desactivada')
  } else snackbar.error(result.message)
}

const cancelTwoFactorChange = () => {
  twoFactorMode.value = null
  twoFactorCode.value = ''
  disablePassword.value = ''
  disableCodeSent.value = false
}

const handleRegisterBiometric = async () => {
  bioLoading.value = true
  const result = await authStore.registerBiometric()
  bioLoading.value = false
  if (result.success) {
    snackbar.success('Face ID / Huella activado')
  } else {
    snackbar.error(result.message)
  }
}

const handleRemoveBiometric = async () => {
  bioLoading.value = true
  const result = await authStore.removeBiometric()
  bioLoading.value = false
  if (result.success) {
    snackbar.success('Face ID / Huella desactivado')
  } else {
    snackbar.error(result.message)
  }
}

onMounted(async () => {
  await billingStore.fetchStatus()
  biometricSupported.value = await authStore.checkBiometricSupport()
  if (biometricSupported.value) {
    await authStore.checkBiometricStatus()
  }
})
</script>
