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
          <h1>Recupera tu acceso de forma segura.</h1>
          <p>Confirmaremos tu identidad con un código de un solo uso antes de permitir una contraseña nueva.</p>
        </div>
      </v-col>

      <v-col cols="12" md="5" class="auth-form-side">
        <v-card class="auth-card">
          <div class="auth-card__mobile-brand">
            <div class="finance-brand__mark" aria-hidden="true"><v-icon size="23">mdi-chart-timeline-variant-shimmer</v-icon></div>
            <div>
              <div class="finance-brand__name">Money Manager</div>
              <div class="finance-brand__tagline">Tu dinero, bajo control</div>
            </div>
          </div>

          <h2>{{ codeRequested ? 'Crea una contraseña nueva' : 'Recupera tu cuenta' }}</h2>
          <p class="auth-card__intro">
            {{ codeRequested ? `Escribe el código enviado a ${email}.` : 'Te enviaremos un código si el correo corresponde a una cuenta.' }}
          </p>

          <v-alert v-if="message" :type="success ? 'success' : 'error'" variant="tonal" closable class="mb-5" @click:close="message = ''">
            {{ message }}
          </v-alert>

          <v-form v-if="!codeRequested" @submit.prevent="requestCode()">
            <label class="text-caption font-weight-bold d-block mb-2">Correo electrónico</label>
            <v-text-field
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="nombre@correo.com"
              prepend-inner-icon="mdi-email-outline"
              variant="outlined"
              required
              :rules="[rules.required, rules.email]"
            />
            <v-btn type="submit" color="primary" size="large" block :loading="loading">Enviar código</v-btn>
          </v-form>

          <v-form v-else @submit.prevent="resetPassword">
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
              class="mb-2"
            />

            <label class="text-caption font-weight-bold d-block mb-2">Contraseña nueva</label>
            <v-text-field
              v-model="newPassword"
              :type="showPassword ? 'text' : 'password'"
              :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              prepend-inner-icon="mdi-lock-outline"
              autocomplete="new-password"
              placeholder="Mínimo 10 caracteres"
              variant="outlined"
              required
              :rules="[rules.password]"
              class="mb-2"
              @click:append-inner="showPassword = !showPassword"
            />

            <label class="text-caption font-weight-bold d-block mb-2">Confirma la contraseña</label>
            <v-text-field
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              prepend-inner-icon="mdi-lock-check-outline"
              autocomplete="new-password"
              variant="outlined"
              required
              :rules="[rules.confirmPassword]"
            />

            <v-btn type="submit" color="primary" size="large" block :loading="loading">Restablecer contraseña</v-btn>
            <v-btn variant="text" color="primary" block class="mt-3" :loading="resendLoading" @click="requestCode(true)">
              Reenviar código
            </v-btn>
          </v-form>

          <v-btn variant="text" block class="mt-5" prepend-icon="mdi-arrow-left" to="/login">Volver al inicio de sesión</v-btn>
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
const email = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const codeRequested = ref(false)
const showPassword = ref(false)
const loading = ref(false)
const resendLoading = ref(false)
const message = ref('')
const success = ref(false)

const rules = {
  required: (value) => !!value || 'Campo obligatorio',
  email: (value) => /.+@.+\..+/.test(value) || 'Correo inválido',
  code: (value) => /^\d{6}$/.test(value) || 'Ingresa los 6 dígitos',
  password: (value) => (value.length >= 10 && new TextEncoder().encode(value).length <= 72) || 'Usa entre 10 y 72 caracteres',
  confirmPassword: (value) => value === newPassword.value || 'Las contraseñas no coinciden',
}

const requestCode = async (resend = false) => {
  if (resend) resendLoading.value = true
  else loading.value = true
  const result = await authStore.requestPasswordReset(email.value)
  loading.value = false
  resendLoading.value = false
  success.value = result.success
  message.value = result.message
  if (result.success) codeRequested.value = true
}

const resetPassword = async () => {
  if (newPassword.value !== confirmPassword.value) {
    success.value = false
    message.value = 'Las contraseñas no coinciden'
    return
  }
  loading.value = true
  const result = await authStore.resetPassword({ email: email.value, code: code.value, newPassword: newPassword.value })
  loading.value = false
  success.value = result.success
  message.value = result.message
  if (result.success) setTimeout(() => router.push('/login'), 1200)
}
</script>
