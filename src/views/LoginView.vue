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
              <div class="finance-brand__name">Knexura Finanzas</div>
              <div class="finance-brand__tagline">Tu dinero, bajo control</div>
            </div>
          </div>
          <h1>Entiende tu dinero. Diseña tu futuro.</h1>
          <p>Organiza tus movimientos, anticipa tus gastos y convierte tus metas en un plan financiero claro.</p>
          <div class="auth-proof">
            <div class="auth-proof__item"><v-icon color="success" size="19">mdi-shield-check</v-icon> Acceso protegido</div>
            <div class="auth-proof__item"><v-icon color="success" size="19">mdi-check-circle</v-icon> Datos seguros</div>
            <div class="auth-proof__item"><v-icon color="success" size="19">mdi-check-circle</v-icon> Insights con IA</div>
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
              <div class="finance-brand__name">Knexura Finanzas</div>
              <div class="finance-brand__tagline">Tu dinero, bajo control</div>
            </div>
          </div>

          <template v-if="step === 'credentials'">
            <h2>Bienvenido de nuevo</h2>
            <p class="auth-card__intro">Ingresa para continuar cuidando tus finanzas.</p>
          </template>
          <template v-else>
            <v-btn variant="text" size="small" prepend-icon="mdi-arrow-left" class="mb-3 px-0" @click="backToCredentials">
              Volver
            </v-btn>
            <h2>Confirma que eres tú</h2>
            <p class="auth-card__intro">
              Escribe el código de 6 dígitos enviado a <strong>{{ email }}</strong>. Expira en 10 minutos.
            </p>
          </template>

          <v-alert v-if="notice" type="success" variant="tonal" closable class="mb-5" @click:close="notice = ''">
            {{ notice }}
          </v-alert>
          <v-alert v-if="authStore.error" type="error" variant="tonal" closable class="mb-5" @click:close="authStore.error = null">
            {{ authStore.error }}
          </v-alert>

          <v-form v-if="step === 'credentials'" @submit.prevent="handleLogin">
            <label class="text-caption font-weight-bold d-block mb-2">Correo electrónico</label>
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

            <div class="d-flex align-center justify-space-between mb-2">
              <label class="text-caption font-weight-bold">Contraseña</label>
              <v-btn variant="text" color="primary" size="x-small" to="/forgot-password">¿La olvidaste?</v-btn>
            </div>
            <v-text-field
              v-model="password"
              placeholder="Ingresa tu contraseña"
              prepend-inner-icon="mdi-lock-outline"
              :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              variant="outlined"
              required
              :rules="[rules.required]"
              @click:append-inner="showPassword = !showPassword"
            />

            <v-btn type="submit" color="primary" block size="large" class="auth-primary-btn mt-2" :loading="authStore.loading && !bioLoading">
              Entrar a mi cuenta
            </v-btn>
          </v-form>

          <v-form v-else @submit.prevent="handleCodeVerification">
            <label class="text-caption font-weight-bold d-block mb-2">Código de seguridad</label>
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
              Verificar y continuar
            </v-btn>
            <v-btn variant="text" color="primary" block class="mt-3" :loading="resendLoading" @click="resendCode">
              Reenviar código
            </v-btn>
          </v-form>

          <template v-if="step === 'credentials'">
            <div v-if="biometricAvailable" class="d-flex align-center my-5">
              <v-divider />
              <span class="text-caption text-medium-emphasis px-3">o continúa con</span>
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
              Face ID o huella
            </v-btn>

            <p class="text-center text-body-2 text-medium-emphasis mt-7 mb-0">
              ¿Aún no tienes cuenta?
              <v-btn variant="text" color="primary" size="small" to="/register">Créala gratis</v-btn>
            </p>
          </template>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

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
  required: (value) => !!value || 'Campo obligatorio',
  email: (value) => /.+@.+\..+/.test(value) || 'Correo inválido',
  code: (value) => /^\d{6}$/.test(value) || 'Ingresa los 6 dígitos',
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
    notice.value = result.message || 'Enviamos un código nuevo.'
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
  const result = await authStore.loginWithBiometric()
  bioLoading.value = false
  if (result.success) {
    router.push('/')
  } else if (result.prefillEmail) {
    email.value = result.prefillEmail
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
