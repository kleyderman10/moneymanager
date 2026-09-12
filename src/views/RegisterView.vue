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
              <div class="finance-brand__name">Money Manager</div>
              <div class="finance-brand__tagline">Tu dinero, bajo control</div>
            </div>
          </div>
          <h1>Haz que cada peso tenga un propósito.</h1>
          <p>Crea una vista completa de tus finanzas y empieza a avanzar hacia lo que realmente importa.</p>
          <div class="auth-proof">
            <div class="auth-proof__item"><v-icon color="success" size="19">mdi-check-circle</v-icon> Presupuestos</div>
            <div class="auth-proof__item"><v-icon color="success" size="19">mdi-check-circle</v-icon> Metas de ahorro</div>
            <div class="auth-proof__item"><v-icon color="success" size="19">mdi-email-check-outline</v-icon> Cuenta verificada</div>
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
              <div class="finance-brand__name">Money Manager</div>
              <div class="finance-brand__tagline">Tu dinero, bajo control</div>
            </div>
          </div>

          <template v-if="!awaitingCode">
            <h2>Crea tu cuenta</h2>
            <p class="auth-card__intro">Empieza con 45 días gratis. Verificaremos tu correo antes de ingresar.</p>
          </template>
          <template v-else>
            <h2>Revisa tu correo</h2>
            <p class="auth-card__intro">
              Enviamos un código de 6 dígitos a <strong>{{ email }}</strong>. Expira en 10 minutos.
            </p>
          </template>

          <v-alert v-if="notice" type="success" variant="tonal" closable class="mb-5" @click:close="notice = ''">
            {{ notice }}
          </v-alert>
          <v-alert v-if="authStore.error" type="error" variant="tonal" closable class="mb-5" @click:close="authStore.error = null">
            {{ authStore.error }}
          </v-alert>

          <v-form v-if="!awaitingCode" @submit.prevent="handleRegister">
            <label class="text-caption font-weight-bold d-block mb-2">Nombre</label>
            <v-text-field
              v-model="name"
              placeholder="Tu nombre"
              prepend-inner-icon="mdi-account-outline"
              autocomplete="name"
              variant="outlined"
              required
              :rules="[rules.required]"
              class="mb-2"
            />

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

            <label class="text-caption font-weight-bold d-block mb-2">Contraseña</label>
            <v-text-field
              v-model="password"
              placeholder="Mínimo 10 caracteres"
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

            <label class="text-caption font-weight-bold d-block mb-2">Confirma la contraseña</label>
            <v-text-field
              v-model="confirmPassword"
              placeholder="Repite tu contraseña"
              prepend-inner-icon="mdi-lock-check-outline"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              variant="outlined"
              required
              :rules="[rules.required, rules.confirmPassword]"
            />

            <v-btn type="submit" color="primary" block size="large" class="auth-primary-btn mt-2" :loading="authStore.loading">
              Crear y verificar mi cuenta
            </v-btn>
          </v-form>

          <v-form v-else @submit.prevent="handleVerification">
            <label class="text-caption font-weight-bold d-block mb-2">Código de verificación</label>
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
              Verificar correo y entrar
            </v-btn>
            <v-btn variant="text" color="primary" block class="mt-3" :loading="resendLoading" @click="resendCode">
              Reenviar código
            </v-btn>
            <v-btn variant="text" block size="small" @click="awaitingCode = false">Cambiar correo</v-btn>
          </v-form>

          <p v-if="!awaitingCode" class="text-center text-body-2 text-medium-emphasis mt-7 mb-0">
            ¿Ya tienes una cuenta?
            <v-btn variant="text" color="primary" size="small" to="/login">Inicia sesión</v-btn>
          </p>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
  required: (value) => !!value || 'Campo obligatorio',
  email: (value) => /.+@.+\..+/.test(value) || 'Correo inválido',
  password: (value) => (value.length >= 10 && new TextEncoder().encode(value).length <= 72) || 'Usa entre 10 y 72 caracteres',
  confirmPassword: (value) => value === password.value || 'Las contraseñas no coinciden',
  code: (value) => /^\d{6}$/.test(value) || 'Ingresa los 6 dígitos',
}

const handleRegister = async () => {
  if (password.value !== confirmPassword.value) {
    authStore.error = 'Las contraseñas no coinciden'
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
