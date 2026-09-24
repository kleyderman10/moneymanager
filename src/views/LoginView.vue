<template>
  <v-container fluid class="auth-shell">
    <v-row no-gutters class="min-h-screen">
      <v-col cols="12" md="7" class="auth-story d-none d-md-flex">
        <div class="auth-story__content">
          <div class="finance-brand pa-0">
            <img src="/icon.svg" alt="" aria-hidden="true" class="finance-brand__logo" />
            <div>
              <div class="finance-brand__name">{{ t('layout.brandName') }}</div>
              <div class="finance-brand__tagline">{{ t('layout.brandTagline') }}</div>
            </div>
          </div>
          <h1>{{ t('auth.heroTitle') }}</h1>
          <p>{{ t('auth.heroSubtitle') }}</p>
          <div class="auth-proof">
            <div class="auth-proof__item"><v-icon color="success" size="19">mdi-shield-check</v-icon> {{ t('auth.proofProtectedAccess') }}</div>
            <div class="auth-proof__item"><v-icon color="success" size="19">mdi-check-circle</v-icon> {{ t('auth.proofSecureData') }}</div>
            <div class="auth-proof__item"><v-icon color="success" size="19">mdi-check-circle</v-icon> {{ t('auth.proofAiInsights') }}</div>
          </div>
        </div>
      </v-col>

      <v-col cols="12" md="5" class="auth-form-side">
        <div class="auth-mobile-hero d-flex d-md-none">
          <img src="/icon.svg" :alt="t('layout.brandName')" class="auth-mobile-hero__mark" />
          <h1 class="auth-mobile-hero__title">{{ t('layout.brandName') }}</h1>
          <p class="auth-mobile-hero__subtitle">{{ t('auth.mobileHeroSubtitle') }}</p>
        </div>

        <v-card class="auth-card">
          <template v-if="step === 'credentials'">
            <h2 v-if="!mobile">{{ t('auth.welcomeBack') }}</h2>
            <p v-if="!mobile" class="auth-card__intro">{{ t('auth.welcomeBackIntro') }}</p>
          </template>
          <template v-else>
            <v-btn variant="text" size="small" prepend-icon="mdi-arrow-left" class="mb-3 px-0" @click="backToCredentials">
              {{ t('common.back') }}
            </v-btn>
            <h2>{{ t('auth.confirmItsYou') }}</h2>
            <p class="auth-card__intro">
              {{ t('auth.codeSentIntro') }} <strong>{{ email }}</strong>. {{ t('auth.codeExpires') }}
            </p>
          </template>

          <v-alert v-if="notice" type="success" variant="tonal" closable class="mb-5" @click:close="notice = ''">
            {{ notice }}
          </v-alert>
          <v-alert v-if="authStore.error" type="error" variant="tonal" closable class="mb-5" @click:close="authStore.error = null">
            {{ authStore.error }}
          </v-alert>

          <v-form v-if="step === 'credentials'" @submit.prevent="handleLogin">
            <label class="text-caption font-weight-bold d-block mb-2">{{ t('auth.email') }}</label>
            <v-text-field
              v-model="email"
              placeholder="nombre@correo.com"
              :prepend-inner-icon="mobile ? undefined : 'mdi-email-outline'"
              type="email"
              autocomplete="email"
              variant="outlined"
              required
              :rules="[rules.required, rules.email]"
              class="mb-2"
            />

            <label class="text-caption font-weight-bold d-block mb-2">{{ t('auth.password') }}</label>
            <v-text-field
              v-model="password"
              :placeholder="t('auth.passwordPlaceholder')"
              :prepend-inner-icon="mobile ? undefined : 'mdi-lock-outline'"
              :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              variant="outlined"
              required
              :rules="[rules.required]"
              class="mb-2"
              @click:append-inner="showPassword = !showPassword"
            />
            <div class="text-right mb-2">
              <v-btn variant="text" color="primary" size="x-small" class="auth-forgot-link px-0" to="/forgot-password">{{ t('auth.forgotPassword') }}</v-btn>
            </div>

            <v-btn type="submit" color="primary" block size="large" class="auth-primary-btn mt-2" :loading="authStore.loading && !bioLoading">
              {{ t('auth.signIn') }}
            </v-btn>
          </v-form>

          <v-form v-else @submit.prevent="handleCodeVerification">
            <label class="text-caption font-weight-bold d-block mb-2">{{ t('auth.securityCode') }}</label>
            <v-text-field
              v-model="code"
              placeholder="000000"
              prepend-inner-icon="mdi-shield-key-outline"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              variant="outlined"
              required
              :rules="[rules.code]"
            />
            <v-btn type="submit" color="primary" block size="large" :loading="authStore.loading">
              {{ t('auth.verifyAndContinue') }}
            </v-btn>
            <v-btn variant="text" color="primary" block class="mt-3" :loading="resendLoading" @click="resendCode">
              {{ t('profile.resendCode') }}
            </v-btn>
          </v-form>

          <template v-if="step === 'credentials'">
            <div v-if="biometricAvailable" class="d-flex align-center my-5">
              <v-divider />
              <span class="text-caption text-medium-emphasis px-3">{{ t('auth.orContinueWith') }}</span>
              <v-divider />
            </div>

            <v-btn
              v-if="biometricAvailable"
              block
              variant="outlined"
              color="primary"
              size="large"
              :loading="bioLoading"
              prepend-icon="mdi-face-recognition"
              @click="handleBiometricLogin"
            >
              {{ t('auth.faceIdOrFingerprint') }}
            </v-btn>

            <p class="text-center text-body-2 text-medium-emphasis mt-7 mb-0">
              {{ t('auth.noAccount') }}
              <v-btn variant="text" color="primary" size="small" class="auth-register-link" to="/register">{{ t('auth.signUp') }}</v-btn>
            </p>
          </template>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const { mdAndUp } = useDisplay()
const mobile = computed(() => !mdAndUp.value)

const email = ref('')
const password = ref('')
const code = ref('')
const step = ref('credentials')
const challengeToken = ref('')
const notice = ref('')
const showPassword = ref(false)
const biometricAvailable = ref(false)
const bioLoading = ref(false)
const resendLoading = ref(false)

const rules = {
  required: (value) => !!value || t('auth.requiredField'),
  email: (value) => /.+@.+\..+/.test(value) || t('auth.invalidEmail'),
  code: (value) => /^\d{6}$/.test(value) || t('profile.codeRuleError'),
}

const handleLogin = async () => {
  const result = await authStore.login({ email: email.value, password: password.value })
  if (result.success && result.requiresTwoFactor) {
    challengeToken.value = result.challengeToken
    step.value = 'twoFactor'
    authStore.error = null
    notice.value = result.message
  } else if (result.success) {
    router.push('/')
  } else if (result.requiresEmailVerification) {
    step.value = 'emailVerification'
    authStore.error = null
    await resendCode()
  }
}

const handleCodeVerification = async () => {
  const result = step.value === 'twoFactor'
    ? await authStore.verifyTwoFactor(challengeToken.value, code.value)
    : await authStore.verifyEmail({ email: email.value, code: code.value })
  if (result.success) router.push('/')
}

const resendCode = async () => {
  resendLoading.value = true
  authStore.error = null
  const result = step.value === 'twoFactor'
    ? await authStore.login({ email: email.value, password: password.value })
    : await authStore.resendVerification(email.value)
  resendLoading.value = false

  if (result.success) {
    if (result.challengeToken) challengeToken.value = result.challengeToken
    notice.value = result.message || t('auth.newCodeSent')
  } else {
    authStore.error = result.message
  }
}

const backToCredentials = () => {
  step.value = 'credentials'
  code.value = ''
  challengeToken.value = ''
  notice.value = ''
  authStore.error = null
}

const handleBiometricLogin = async () => {
  bioLoading.value = true
  authStore.error = null
  try {
    const result = await authStore.loginWithBiometric()
    if (result.success) {
      // Older Face ID/huella setups are migrated once: re-enable it with the password.
      router.push(result.needsBiometricUpgrade ? '/profile?upgradeBiometric=1' : '/')
    } else if (result.prefillEmail) {
      email.value = result.prefillEmail
    }
  } catch {
    authStore.error = t('auth.biometricLoginError')
  } finally {
    bioLoading.value = false
  }
}

onMounted(async () => {
  const supported = await authStore.checkBiometricSupport()
  if (supported) {
    await authStore.checkBiometricStatus()
  }
  biometricAvailable.value = supported && authStore.hasBiometric
})
</script>
