<template>
  <div>
    <div data-tour="page-intro" class="page-intro">
      <div class="page-intro__eyebrow">{{ t('profile.yourAccount') }}</div>
      <h1 :class="isMobile ? 'text-h5' : 'text-h4'">{{ t('profile.title') }}</h1>
      <p class="page-intro__subtitle">{{ t('profile.subtitle') }}</p>
    </div>

    <v-row>
      <v-col cols="12" md="6">
        <v-card :title="t('profile.personalInfo')" data-tour="profile-personal">
          <v-card-text>
            <v-form @submit.prevent="saveProfile">
              <v-text-field v-model="profileForm.name" :label="t('profile.name')" variant="outlined" density="compact" required class="mb-3" />
              <v-text-field :model-value="authStore.user?.email" label="Email" variant="outlined" density="compact" disabled class="mb-3" />
              <v-chip color="success" variant="tonal" size="small" prepend-icon="mdi-email-check-outline" class="mb-4">
                {{ t('profile.emailVerified') }}
              </v-chip>
              <v-select
                v-model="profileForm.country"
                :items="countryOptions"
                item-title="label"
                item-value="code"
                :label="t('profile.country')"
                variant="outlined"
                density="compact"
                class="mb-1"
              />
              <p class="text-caption text-medium-emphasis mb-3">
                {{ t('profile.currencyFollowsCountry', { currency: currencyPreview }) }}
              </p>
              <v-select
                v-model="profileForm.language"
                :items="languageOptions"
                item-title="label"
                item-value="code"
                :label="t('profile.language')"
                variant="outlined"
                density="compact"
                class="mb-3"
              />
              <v-btn type="submit" class="form-actions__primary" :loading="profileLoading" block>{{ t('profile.saveChanges') }}</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card :title="t('profile.changePassword')">
          <v-card-text>
            <v-alert v-if="passMsg" :type="passSuccess ? 'success' : 'error'" density="compact" class="mb-2">{{ passMsg }}</v-alert>
            <v-form @submit.prevent="savePassword">
              <v-text-field v-model="passForm.currentPassword" :label="t('profile.currentPassword')" type="password" variant="outlined" density="compact" required class="mb-3" />
              <v-text-field
                v-model="passForm.newPassword"
                :label="t('profile.newPassword')"
                type="password"
                variant="outlined"
                density="compact"
                :hint="t('profile.passwordHint')"
                :rules="[passwordRule]"
                required
                class="mb-3"
              />
              <template v-if="passCodeSent">
                <p class="text-body-2 mb-3">{{ t('profile.passwordCodeSent') }}</p>
                <v-text-field
                  v-model="passForm.code"
                  :label="t('profile.sixDigitCode')"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  maxlength="6"
                  prepend-inner-icon="mdi-shield-key-outline"
                  variant="outlined"
                  density="compact"
                  :rules="[codeRule]"
                  class="mb-3"
                />
                <v-btn type="submit" class="form-actions__primary" :loading="passLoading" block>{{ t('profile.updatePassword') }}</v-btn>
                <v-btn variant="text" color="primary" block class="mt-2" :loading="passLoading" @click="sendPasswordCode">{{ t('profile.resendCode') }}</v-btn>
                <v-btn variant="text" block @click="resetPasswordForm">{{ t('common.cancel') }}</v-btn>
              </template>
              <v-btn v-else type="submit" class="form-actions__primary" :loading="passLoading" block>{{ t('auth.sendCode') }}</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card :title="t('profile.twoFactor')" data-tour="profile-security">
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
                  ? t('profile.twoFactorActive')
                  : t('profile.twoFactorInactive') }}
              </v-alert>
              <v-btn
                v-if="!authStore.user?.twoFactorEnabled"
                color="primary"
                block
                :loading="twoFactorLoading"
                prepend-icon="mdi-two-factor-authentication"
                @click="startTwoFactorSetup"
              >
                {{ t('profile.enableTwoFactor') }}
              </v-btn>
              <v-btn v-else color="error" variant="outlined" block @click="twoFactorMode = 'disable'">
                {{ t('profile.disableTwoFactor') }}
              </v-btn>
            </template>

            <template v-else-if="twoFactorMode === 'enable'">
              <p class="text-body-2 text-medium-emphasis mb-3">{{ t('profile.codeSentTo', { email: authStore.user?.email }) }}</p>
              <v-text-field
                v-model="twoFactorCode"
                :label="t('profile.sixDigitCode')"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                prepend-inner-icon="mdi-shield-key-outline"
                :rules="[codeRule]"
              />
              <v-btn color="primary" block :loading="twoFactorLoading" @click="confirmTwoFactorSetup">{{ t('profile.confirmAndEnable') }}</v-btn>
              <v-btn variant="text" color="primary" block class="mt-2" :loading="twoFactorLoading" @click="startTwoFactorSetup">{{ t('profile.resendCode') }}</v-btn>
              <v-btn variant="text" block @click="cancelTwoFactorChange">{{ t('common.cancel') }}</v-btn>
            </template>

            <template v-else>
              <p class="text-body-2 text-medium-emphasis mb-3">{{ t('profile.confirmPasswordAndCode') }}</p>
              <v-text-field
                v-model="disablePassword"
                :label="t('profile.currentPassword')"
                type="password"
                autocomplete="current-password"
                prepend-inner-icon="mdi-lock-outline"
                required
              />
              <v-text-field
                v-if="disableCodeSent"
                v-model="twoFactorCode"
                :label="t('profile.sixDigitCode')"
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
                {{ disableCodeSent ? t('profile.confirmAndDisable') : t('profile.sendConfirmationCode') }}
              </v-btn>
              <v-btn v-if="disableCodeSent" variant="text" color="primary" block class="mt-2" :loading="twoFactorLoading" @click="requestTwoFactorDisable">
                {{ t('profile.resendCode') }}
              </v-btn>
              <v-btn variant="text" block @click="cancelTwoFactorChange">{{ t('common.cancel') }}</v-btn>
            </template>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card :title="t('profile.planAndBilling')">
          <v-card-text>
            <div class="d-flex align-center justify-space-between mb-3">
              <div>
                <div class="text-subtitle-1 font-weight-bold">{{ t('layout.brandName') }} Personal</div>
                <div class="text-body-2 text-medium-emphasis">{{ t('profile.pricePerQuarter', { price: formattedPlanPrice }) }}</div>
              </div>
              <v-chip :color="billingStatusColor" variant="tonal" size="small">
                {{ billingStatusLabel }}
              </v-chip>
            </div>
            <p class="text-body-2 text-medium-emphasis mb-4">{{ billingMessage }}</p>
            <v-btn color="primary" variant="outlined" block prepend-icon="mdi-credit-card-outline" to="/subscription">
              {{ t('profile.manageSubscription') }}
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card :title="t('profile.privacyAndAI')" data-tour="profile-ai">
          <v-card-text>
            <v-alert
              v-if="authStore.hasAcceptedAIConsent"
              type="success"
              density="compact"
              variant="tonal"
              class="mb-3"
              icon="mdi-shield-check"
            >
              {{ t('profile.aiConsentAccepted') }}
            </v-alert>
            <v-alert v-else type="info" density="compact" variant="tonal" class="mb-3">
              {{ t('profile.aiConsentPending') }}
            </v-alert>
            <v-btn color="primary" variant="outlined" block prepend-icon="mdi-robot-outline" @click="showConsentDialog = true">
              {{ authStore.hasAcceptedAIConsent ? t('profile.reviewOrRevokeAI') : t('profile.reviewAI') }}
            </v-btn>
            <v-btn
              variant="text"
              block
              class="mt-2"
              prepend-icon="mdi-shield-lock-outline"
              @click="openPrivacyPolicy"
            >
              {{ t('profile.viewPrivacyPolicy') }}
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col v-if="biometricSupported" cols="12" md="6">
        <v-card :title="t('profile.biometricAuth')">
          <v-card-text>
            <v-alert
              v-if="authStore.hasBiometric"
              type="success"
              density="compact"
              variant="tonal"
              class="mb-3"
              icon="mdi-shield-check"
            >
              {{ t('profile.biometricEnabled') }}
            </v-alert>
            <v-alert
              v-else
              type="info"
              density="compact"
              variant="tonal"
              class="mb-3"
            >
              {{ t('profile.biometricPitch') }}
            </v-alert>
            <v-btn
              v-if="authStore.hasBiometric"
              color="error"
              variant="outlined"
              block
              :loading="bioLoading"
              @click="handleRemoveBiometric"
            >
              {{ t('profile.disableBiometric') }}
            </v-btn>
            <v-btn
              v-else
              color="primary"
              block
              :loading="bioLoading"
              prepend-icon="mdi-face-recognition"
              @click="handleRegisterBiometric"
            >
              {{ t('profile.enableBiometric') }}
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12">
        <v-card :title="t('profile.deleteAccount')" class="delete-account-card">
          <v-card-text>
            <p class="text-body-2 mb-3">
              {{ t('profile.deleteAccountBody') }}
            </p>
            <v-alert type="warning" density="compact" variant="tonal" class="mb-3">
              {{ t('profile.deleteAccountWarning') }}
              <template v-if="manageHint">{{ t('profile.cancelFrom', { place: manageHint }) }}</template>
              <template v-else>{{ t('profile.cancelFromStore') }}</template>.
            </v-alert>
            <p class="text-body-2 mb-2">{{ t('profile.downloadMyDataHint') }}</p>
            <v-btn variant="outlined" prepend-icon="mdi-download" class="mb-4" :loading="exportLoading" @click="downloadMyData">
              {{ t('profile.downloadMyData') }}
            </v-btn>
            <br />
            <v-btn color="error" variant="outlined" prepend-icon="mdi-delete-forever-outline" @click="showDeleteDialog = true">
              {{ t('profile.deleteMyAccount') }}
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
      <v-card :title="t('profile.deleteAccountConfirmTitle')">
        <v-card-text>
          <p class="text-body-2 mb-4">
            {{ t('profile.deleteAccountConfirmBody') }}
          </p>
          <v-text-field
            v-model="deletePassword"
            :label="t('profile.password')"
            type="password"
            variant="outlined"
            density="comfortable"
            autocomplete="current-password"
            :disabled="deleteLoading"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="deleteLoading" @click="closeDeleteDialog">{{ t('common.cancel') }}</v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="deleteLoading"
            :disabled="!deletePassword"
            @click="handleDeleteAccount"
          >
            {{ t('profile.deleteAccount') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showBioPasswordDialog" max-width="420" persistent>
      <v-card :title="t('profile.enableBiometric')">
        <v-card-text>
          <p class="text-body-2 mb-4">{{ t('profile.biometricConfirmPassword') }}</p>
          <v-text-field
            v-model="bioPassword"
            :label="t('profile.password')"
            type="password"
            variant="outlined"
            density="comfortable"
            autocomplete="current-password"
            :disabled="bioLoading"
            @keyup.enter="bioPassword && confirmRegisterBiometric()"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="bioLoading" @click="closeBioPasswordDialog">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" :loading="bioLoading" :disabled="!bioPassword" @click="confirmRegisterBiometric">
            {{ t('common.confirm') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AIConsentDialog from '@/components/AIConsentDialog.vue'
import { useDisplay } from 'vuetify'
import { useAuthStore } from '@/stores/auth'
import { authAPI } from '@/api'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { useSnackbar } from '@/stores/snackbar'
import { useLocale } from '@/composables/useLocale'
import { openLegalLink, PRIVACY_POLICY_URL } from '@/utils/legalLinks'
import { storeManageHint } from '@/utils/nativeIAP'
import { COUNTRIES, findCountry, DEFAULT_COUNTRY_CODE } from '@/constants/countries'
import { setLanguage, SUPPORTED_LANGUAGES } from '@/i18n'

const { t, locale } = useI18n()
const { mobile } = useDisplay()
const router = useRouter()
const route = useRoute()
const isMobile = computed(() => mobile.value)
const authStore = useAuthStore()
const billingStore = useSubscriptionStore()
const snackbar = useSnackbar()
const { money } = useLocale()

const profileForm = reactive({
  name: authStore.user?.name,
  country: authStore.user?.country || DEFAULT_COUNTRY_CODE,
  language: authStore.user?.language || 'es',
})
const profileLoading = ref(false)

const countryOptions = computed(() => COUNTRIES.map((c) => ({
  code: c.code,
  label: `${c.flag} ${locale.value === 'en' ? c.nameEn : c.nameEs} · ${c.currency}`,
})))
const languageOptions = computed(() => SUPPORTED_LANGUAGES.map((code) => ({
  code,
  label: code === 'es' ? t('profile.spanish') : t('profile.english'),
})))
const currencyPreview = computed(() => findCountry(profileForm.country)?.currency || 'USD')

// Cambiar el idioma actualiza la interfaz de inmediato; se persiste al guardar el perfil.
watch(() => profileForm.language, (lang) => setLanguage(lang))
const passForm = reactive({ currentPassword: '', newPassword: '', code: '' })
const passCodeSent = ref(false)
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
) || t('profile.passwordRuleError')
const codeRule = (value) => /^\d{6}$/.test(value) || t('profile.codeRuleError')

const formattedPlanPrice = computed(() => money(
  billingStore.status?.plan?.amount || 15000,
  billingStore.status?.plan?.currency || undefined,
))
const billingStatusLabel = computed(() => ({
  trialing: t('profile.billingTrialing'),
  active: t('profile.billingActive'),
  past_due: t('profile.billingPastDue'),
  canceled: t('profile.billingCanceled'),
  incomplete: t('profile.billingIncomplete'),
  expired: t('profile.billingExpired'),
  exempt: t('profile.billingExempt'),
}[billingStore.status?.status] || t('profile.billingChecking')))
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
    return t('profile.billingTrialDaysLeft', { days: billingStore.status.daysRemaining })
  }
  if (billingStore.status?.status === 'active') return t('profile.billingUpToDate')
  if (billingStore.status?.status === 'canceled') return t('profile.billingKeepsAccess')
  if (billingStore.status?.requiresSubscription) return t('profile.billingUpgrade')
  return t('profile.billingSeeDetails')
})

const saveProfile = async () => {
  profileLoading.value = true
  try {
    await authStore.updateProfile({
      name: profileForm.name,
      country: profileForm.country,
      currency: currencyPreview.value,
      language: profileForm.language,
    })
    snackbar.success(t('profile.profileUpdated'))
  } catch { snackbar.error(t('profile.profileUpdateError')) }
  profileLoading.value = false
}

const resetPasswordForm = () => {
  passForm.currentPassword = ''; passForm.newPassword = ''; passForm.code = ''
  passCodeSent.value = false
}

// Step 1: the current password is checked and a confirmation code is emailed.
const sendPasswordCode = async () => {
  if (!passForm.currentPassword || passwordRule(passForm.newPassword) !== true) return
  passLoading.value = true; passMsg.value = ''
  const result = await authStore.requestPasswordChange(passForm.currentPassword)
  passLoading.value = false
  if (result.success) {
    passCodeSent.value = true
  } else {
    passSuccess.value = false; passMsg.value = result.message
  }
}

// Step 2: this device stays signed in (and keeps Face ID/huella); other devices are signed out.
const savePassword = async () => {
  if (!passCodeSent.value) return sendPasswordCode()
  if (codeRule(passForm.code) !== true) return
  passLoading.value = true; passMsg.value = ''
  const result = await authStore.changePassword({
    currentPassword: passForm.currentPassword,
    newPassword: passForm.newPassword,
    code: passForm.code,
  })
  passLoading.value = false
  if (result.success) {
    resetPasswordForm()
    snackbar.success(result.message)
  } else {
    passSuccess.value = false; passMsg.value = result.message
  }
}

const openPrivacyPolicy = () => openLegalLink(PRIVACY_POLICY_URL)

// Right of access / portability (Ley 1581): a JSON copy of everything the account holds.
const exportLoading = ref(false)
const downloadMyData = async () => {
  exportLoading.value = true
  try {
    const res = await authAPI.exportData()
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `mis-datos-${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch {
    snackbar.error(t('profile.downloadMyDataError'))
  } finally {
    exportLoading.value = false
  }
}

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
  snackbar.success(t('profile.accountDeleted'))
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
    snackbar.success(t('profile.twoFactorEnabled'))
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
    snackbar.success(t('profile.twoFactorDisabled'))
  } else snackbar.error(result.message)
}

const cancelTwoFactorChange = () => {
  twoFactorMode.value = null
  twoFactorCode.value = ''
  disablePassword.value = ''
  disableCodeSent.value = false
}

// Both passkeys (web) and the native Face ID/huella credential are persistent on the server,
// so enabling either asks for the current password first.
const showBioPasswordDialog = ref(false)
const bioPassword = ref('')

const closeBioPasswordDialog = () => {
  showBioPasswordDialog.value = false
  bioPassword.value = ''
}

const handleRegisterBiometric = () => {
  showBioPasswordDialog.value = true
}

const confirmRegisterBiometric = async () => {
  bioLoading.value = true
  const result = await authStore.registerBiometric(bioPassword.value)
  bioLoading.value = false
  closeBioPasswordDialog()
  if (result.success) {
    snackbar.success(t('profile.biometricActivated'))
  } else if (!result.cancelled) {
    snackbar.error(result.message)
  }
}

const handleRemoveBiometric = async () => {
  bioLoading.value = true
  const result = await authStore.removeBiometric()
  bioLoading.value = false
  if (result.success) {
    snackbar.success(t('profile.biometricDeactivated'))
  } else {
    snackbar.error(result.message)
  }
}

onMounted(async () => {
  await billingStore.fetchStatus()
  biometricSupported.value = await authStore.checkBiometricSupport()
  if (biometricSupported.value) {
    await authStore.checkBiometricStatus()
    // Coming from a one-time migration of an older Face ID/huella setup.
    if (route.query.upgradeBiometric && !authStore.hasBiometric) {
      snackbar.info(t('profile.biometricUpgradeNotice'))
      showBioPasswordDialog.value = true
    }
  }
})
</script>
