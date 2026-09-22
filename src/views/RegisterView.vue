<template>
  <v-container fluid class="auth-shell">
    <v-row no-gutters class="min-h-screen">
      <v-col cols="12" md="7" class="auth-story d-none d-md-flex">
        <div class="auth-story__content">
          <div class="finance-brand pa-0">
            <div class="finance-brand__mark" aria-hidden="true">
              <v-icon size="25">mdi-chart-timeline-variant-shimmer</v-icon>
            </div>
            <div>
              <div class="finance-brand__name">{{ t('layout.brandName') }}</div>
              <div class="finance-brand__tagline">{{ t('layout.brandTagline') }}</div>
            </div>
          </div>
          <h1>{{ t('auth.registerHeroTitle') }}</h1>
          <p>{{ t('auth.registerHeroSubtitle') }}</p>
          <div class="auth-proof">
            <div class="auth-proof__item"><v-icon color="success" size="19">mdi-check-circle</v-icon> {{ t('nav.budgets') }}</div>
            <div class="auth-proof__item"><v-icon color="success" size="19">mdi-check-circle</v-icon> {{ t('nav.goals') }}</div>
            <div class="auth-proof__item"><v-icon color="success" size="19">mdi-email-check-outline</v-icon> {{ t('auth.verifiedAccount') }}</div>
          </div>
        </div>
      </v-col>

      <v-col cols="12" md="5" class="auth-form-side">
        <v-card class="auth-card">
          <div class="auth-card__mobile-brand">
            <div class="finance-brand__mark" aria-hidden="true">
              <v-icon size="23">mdi-chart-timeline-variant-shimmer</v-icon>
            </div>
            <div>
              <div class="finance-brand__name">{{ t('layout.brandName') }}</div>
              <div class="finance-brand__tagline">{{ t('layout.brandTagline') }}</div>
            </div>
          </div>

          <template v-if="!awaitingCode">
            <h2>{{ t('auth.createAccount') }}</h2>
            <p class="auth-card__intro">{{ t('auth.createAccountIntro') }}</p>
          </template>
          <template v-else>
            <h2>{{ t('auth.checkYourEmail') }}</h2>
            <p class="auth-card__intro">
              {{ t('auth.codeSentTo') }} <strong>{{ email }}</strong>. {{ t('auth.codeExpires') }}
            </p>
          </template>

          <v-alert v-if="notice" type="success" variant="tonal" closable class="mb-5" @click:close="notice = ''">
            {{ notice }}
          </v-alert>
          <v-alert v-if="authStore.error" type="error" variant="tonal" closable class="mb-5" @click:close="authStore.error = null">
            {{ authStore.error }}
          </v-alert>

          <v-form v-if="!awaitingCode" @submit.prevent="handleRegister">
            <label class="text-caption font-weight-bold d-block mb-2">{{ t('profile.name') }}</label>
            <v-text-field
              v-model="name"
              :placeholder="t('auth.namePlaceholder')"
              prepend-inner-icon="mdi-account-outline"
              autocomplete="name"
              variant="outlined"
              required
              :rules="[rules.required]"
              class="mb-2"
            />

            <label class="text-caption font-weight-bold d-block mb-2">{{ t('auth.email') }}</label>
            <v-text-field
              v-model="email"
              placeholder="nombre@correo.com"
              prepend-inner-icon="mdi-email-outline"
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
              :placeholder="t('auth.minChars')"
              prepend-inner-icon="mdi-lock-outline"
              :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              variant="outlined"
              required
              :rules="[rules.required, rules.password]"
              class="mb-2"
              @click:append-inner="showPassword = !showPassword"
            />

            <label class="text-caption font-weight-bold d-block mb-2">{{ t('auth.confirmPassword') }}</label>
            <v-text-field
              v-model="confirmPassword"
              :placeholder="t('auth.repeatPassword')"
              prepend-inner-icon="mdi-lock-check-outline"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              variant="outlined"
              required
              :rules="[rules.required, rules.confirmPassword]"
            />

            <v-btn type="submit" color="primary" block size="large" class="auth-primary-btn mt-2" :loading="authStore.loading">
              {{ t('auth.createAndVerify') }}
            </v-btn>
          </v-form>

          <v-form v-else @submit.prevent="handleVerification">
            <label class="text-caption font-weight-bold d-block mb-2">{{ t('auth.verificationCode') }}</label>
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
              {{ t('auth.verifyEmailAndEnter') }}
            </v-btn>
            <v-btn variant="text" color="primary" block class="mt-3" :loading="resendLoading" @click="resendCode">
              {{ t('profile.resendCode') }}
            </v-btn>
            <v-btn variant="text" block size="small" @click="awaitingCode = false">{{ t('auth.changeEmail') }}</v-btn>
          </v-form>

          <p v-if="!awaitingCode" class="text-center text-body-2 text-medium-emphasis mt-7 mb-0">
            {{ t('auth.alreadyHaveAccount') }}
            <v-btn variant="text" color="primary" size="small" to="/login">{{ t('auth.signIn') }}</v-btn>
          </p>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const code = ref('')
const showPassword = ref(false)
const awaitingCode = ref(false)
const resendLoading = ref(false)
const notice = ref('')

const rules = {
  required: (value) => !!value || t('auth.requiredField'),
  email: (value) => /.+@.+\..+/.test(value) || t('auth.invalidEmail'),
  password: (value) => (value.length >= 10 && new TextEncoder().encode(value).length <= 72) || t('profile.passwordRuleError'),
  confirmPassword: (value) => value === password.value || t('auth.passwordsDontMatch'),
  code: (value) => /^\d{6}$/.test(value) || t('profile.codeRuleError'),
}

const handleRegister = async () => {
  if (password.value !== confirmPassword.value) {
    authStore.error = t('auth.passwordsDontMatch')
    return
  }
  const result = await authStore.register({ name: name.value, email: email.value, password: password.value })
  if (result.success && result.requiresEmailVerification) {
    awaitingCode.value = true
    notice.value = result.message
    authStore.error = null
  }
}

const handleVerification = async () => {
  const result = await authStore.verifyEmail({ email: email.value, code: code.value })
  if (result.success) router.push('/')
}

const resendCode = async () => {
  resendLoading.value = true
  authStore.error = null
  const result = await authStore.resendVerification(email.value)
  resendLoading.value = false
  if (result.success) notice.value = result.message
  else authStore.error = result.message
}
</script>
