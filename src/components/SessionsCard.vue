<template>
  <v-card :title="t('profile.sessions.title')" :subtitle="t('profile.sessions.subtitle')">
    <v-card-text>
      <v-progress-linear v-if="loading" indeterminate class="mb-2" />
      <v-alert v-else-if="failed" type="warning" variant="tonal" :text="t('common.loadError')">
        <template #append>
          <v-btn variant="text" @click="load">{{ t('common.retry') }}</v-btn>
        </template>
      </v-alert>
      <v-list v-else lines="two" bg-color="transparent">
        <v-list-item v-for="session in sessions" :key="session.id" :prepend-icon="deviceIcon(session.userAgent)">
          <v-list-item-title>
            {{ deviceName(session.userAgent) }}
            <v-chip v-if="session.current" size="x-small" color="primary" class="ml-1">{{ t('profile.sessions.thisDevice') }}</v-chip>
          </v-list-item-title>
          <v-list-item-subtitle>
            {{ t('profile.sessions.lastActive', { date: formatDate(session.lastActiveAt) }) }}
          </v-list-item-subtitle>
          <template v-if="!session.current" #append>
            <v-btn
              variant="text"
              color="error"
              size="small"
              :loading="busyId === session.id"
              :aria-label="t('profile.sessions.close')"
              @click="close(session)"
            >{{ t('profile.sessions.close') }}</v-btn>
          </template>
        </v-list-item>
      </v-list>
      <v-btn
        v-if="sessions.length > 1"
        variant="outlined"
        color="error"
        class="mt-2"
        :loading="busyId === 'all'"
        @click="closeOthers"
      >{{ t('profile.sessions.closeOthers') }}</v-btn>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { authAPI } from '@/api'
import { useSnackbar } from '@/stores/snackbar'
import { useLocale } from '@/composables/useLocale'

const { t } = useI18n()
const { dateLong } = useLocale()
const snackbar = useSnackbar()

const sessions = ref([])
const loading = ref(true)
const failed = ref(false)
const busyId = ref(null)

const formatDate = (value) => dateLong(value, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// The user-agent is only used to give each row a recognisable name.
const deviceName = (ua = '') => {
  const os = /iPhone|iPad/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
      : /Windows/.test(ua) ? 'Windows'
        : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
          : /Linux/.test(ua) ? 'Linux' : ''
  const app = /CriOS|Chrome/.test(ua) ? 'Chrome'
    : /Firefox/.test(ua) ? 'Firefox'
      : /Safari/.test(ua) ? 'Safari' : ''
  return [app, os].filter(Boolean).join(' · ') || t('profile.sessions.unknownDevice')
}
const deviceIcon = (ua = '') => (/iPhone|iPad|Android/.test(ua) ? 'mdi-cellphone' : 'mdi-laptop')

const load = async () => {
  loading.value = true
  failed.value = false
  try {
    sessions.value = (await authAPI.listSessions()).data
  } catch {
    failed.value = true
  }
  loading.value = false
}

const close = async (session) => {
  busyId.value = session.id
  try {
    await authAPI.revokeSession(session.id)
    sessions.value = sessions.value.filter((s) => s.id !== session.id)
    snackbar.success(t('profile.sessions.closed'))
  } catch {
    snackbar.error(t('common.error'))
  }
  busyId.value = null
}

const closeOthers = async () => {
  busyId.value = 'all'
  try {
    await authAPI.revokeOtherSessions()
    sessions.value = sessions.value.filter((s) => s.current)
    snackbar.success(t('profile.sessions.closed'))
  } catch {
    snackbar.error(t('common.error'))
  }
  busyId.value = null
}

onMounted(load)
</script>
