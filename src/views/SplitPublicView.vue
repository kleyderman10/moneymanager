<template>
  <v-container class="split-public d-flex align-center justify-center">
    <v-card max-width="440" width="100%" class="pa-2">
      <div v-if="loading" class="text-center pa-8"><v-progress-circular indeterminate color="primary" /></div>

      <template v-else-if="info">
        <v-card-title>{{ info.title }}</v-card-title>
        <v-card-text>
          <div class="text-body-2 text-medium-emphasis">{{ t('splits.publicFrom', { name: info.ownerName }) }}</div>
          <div class="kf-amount text-h4 my-3">{{ money(info.amount, info.currency) }}</div>
          <div class="text-caption text-medium-emphasis">{{ t('splits.publicFor', { name: info.participantName }) }} · {{ date(info.date) }}</div>
          <v-alert v-if="done" type="success" variant="tonal" class="mt-4">{{ t('splits.publicDone') }}</v-alert>
          <v-alert v-else-if="!loggedIn" type="info" variant="tonal" class="mt-4">{{ t('splits.publicLogin') }}</v-alert>
        </v-card-text>
        <v-card-actions v-if="!done">
          <v-btn v-if="!loggedIn" color="primary" block variant="flat" @click="goLogin">{{ t('splits.publicLoginBtn') }}</v-btn>
          <v-btn v-else color="primary" block variant="flat" :loading="accepting" @click="accept">{{ t('splits.accept') }}</v-btn>
        </v-card-actions>
        <v-card-actions v-else>
          <v-btn color="primary" block variant="tonal" @click="router.push('/splits')">{{ t('splits.publicOpenApp') }}</v-btn>
        </v-card-actions>
      </template>

      <v-card-text v-else class="text-center">
        <v-icon size="x-large" color="warning">mdi-link-off</v-icon>
        <div class="mt-2">{{ t('splits.publicInvalid') }}</div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { splitsAPI } from '@/api'
import { useSnackbar } from '@/stores/snackbar'
import { useLocale } from '@/composables/useLocale'

const { t } = useI18n()
const { money, date } = useLocale()
const route = useRoute()
const router = useRouter()
const snackbar = useSnackbar()

const token = route.params.token
const loggedIn = Boolean(localStorage.getItem('accessToken'))
const loading = ref(true)
const accepting = ref(false)
const done = ref(false)
const info = ref(null)

onMounted(async () => {
  try {
    info.value = (await splitsAPI.getShared(token)).data
  } catch {
    info.value = null
  }
  loading.value = false
})

// Tras iniciar sesión o registrarse, el usuario vuelve a esta misma pantalla.
const goLogin = () => router.push({ name: 'Login', query: { redirect: route.fullPath } })

const accept = async () => {
  accepting.value = true
  try {
    await splitsAPI.acceptShared(token)
    done.value = true
  } catch (error) {
    snackbar.error(error?.response?.data?.message || t('splits.saveError'))
  }
  accepting.value = false
}
</script>

<style scoped>
.split-public { min-height: 100vh; }
</style>
