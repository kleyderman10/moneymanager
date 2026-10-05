<template>
  <v-card :title="t('profile.assistantMemory.title')" :subtitle="t('profile.assistantMemory.subtitle')">
    <v-card-text>
      <v-progress-linear v-if="loading" indeterminate class="mb-2" />
      <v-alert v-else-if="failed" type="warning" variant="tonal" :text="t('common.loadError')">
        <template #append>
          <v-btn variant="text" @click="load">{{ t('common.retry') }}</v-btn>
        </template>
      </v-alert>
      <p v-else-if="!habits.length" class="text-body-2 text-medium-emphasis">{{ t('profile.assistantMemory.empty') }}</p>
      <v-list v-else density="compact" bg-color="transparent">
        <v-list-item
          v-for="habit in habits"
          :key="`${habit.kind}:${habit.term}:${habit.target}`"
          :prepend-icon="habit.kind === 'wallet' ? 'mdi-wallet-outline' : 'mdi-shape-outline'"
          :title="`“${habit.term}” → ${habit.target}`"
          :subtitle="t('profile.assistantMemory.times', { count: habit.count }, habit.count)"
        />
      </v-list>
      <v-btn
        v-if="habits.length"
        variant="outlined"
        color="error"
        class="mt-2"
        prepend-icon="mdi-delete-outline"
        @click="confirmOpen = true"
      >{{ t('profile.assistantMemory.forget') }}</v-btn>
    </v-card-text>
  </v-card>

  <ConfirmDialog
    v-model="confirmOpen"
    :title="t('profile.assistantMemory.forget')"
    :message="t('profile.assistantMemory.forgetConfirm')"
    :confirm-label="t('profile.assistantMemory.forget')"
    :loading="clearing"
    @confirm="clear"
  />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { assistantAPI } from '@/api'
import { useSnackbar } from '@/stores/snackbar'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const { t } = useI18n()
const snackbar = useSnackbar()

const habits = ref([])
const loading = ref(true)
const failed = ref(false)
const confirmOpen = ref(false)
const clearing = ref(false)

const load = async () => {
  loading.value = true
  failed.value = false
  try {
    habits.value = (await assistantAPI.getMemory()).data.habits || []
  } catch {
    failed.value = true
  }
  loading.value = false
}

const clear = async () => {
  clearing.value = true
  try {
    await assistantAPI.clearMemory()
    habits.value = []
    confirmOpen.value = false
    snackbar.success(t('profile.assistantMemory.cleared'))
  } catch {
    snackbar.error(t('common.error'))
  }
  clearing.value = false
}

onMounted(load)
</script>
