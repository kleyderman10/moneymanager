<template>
  <v-dialog :model-value="modelValue" max-width="460" @update:model-value="emit('update:modelValue', $event)">
    <v-card :title="t('wallets.recalc.title', { name: wallet?.name || '' })">
      <v-card-text>
        <div v-if="loading" class="text-center pa-4"><v-progress-circular indeterminate /></div>
        <v-alert v-else-if="failed" type="warning" variant="tonal" :text="t('common.loadError')" />
        <template v-else-if="info">
          <p class="text-body-2 text-medium-emphasis mb-3">{{ t('wallets.recalc.explain') }}</p>
          <div class="recalc-rows">
            <div><span>{{ t('wallets.recalc.current') }}</span><strong>{{ fmt(info.currentBalance) }}</strong></div>
            <template v-if="info.hasOpeningBalance">
              <div><span>{{ t('wallets.recalc.opening') }}</span><strong>{{ fmt(info.openingBalance) }}</strong></div>
              <div><span>{{ t('wallets.recalc.movements', { count: info.movementsCount }, info.movementsCount) }}</span><strong>{{ fmt(info.movementsNet) }}</strong></div>
              <div><span>{{ t('wallets.recalc.calculated') }}</span><strong>{{ fmt(info.calculatedBalance) }}</strong></div>
            </template>
          </div>

          <v-alert v-if="info.hasOpeningBalance && info.difference === 0" type="success" variant="tonal" class="mt-3" :text="t('wallets.recalc.ok')" />
          <v-alert v-else-if="info.hasOpeningBalance" type="warning" variant="tonal" class="mt-3">
            {{ t('wallets.recalc.differs', { amount: fmt(Math.abs(info.difference)) }) }}
          </v-alert>
          <template v-else>
            <v-alert type="info" variant="tonal" class="mt-3" :text="t('wallets.recalc.needsReal')" />
            <v-text-field
              v-model="realBalance"
              type="number"
              inputmode="decimal"
              :label="t('wallets.recalc.realBalance')"
              variant="outlined"
              density="compact"
              hide-details
              class="mt-3"
            />
          </template>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" :loading="saving" :disabled="!canApply" @click="apply">
          {{ info?.hasOpeningBalance ? t('wallets.recalc.apply') : t('wallets.recalc.setBalance') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { walletsAPI } from '@/api'
import { useSnackbar } from '@/stores/snackbar'
import { useLocale } from '@/composables/useLocale'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  wallet: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'recalculated'])

const { t } = useI18n()
const { money } = useLocale()
const snackbar = useSnackbar()

const info = ref(null)
const loading = ref(false)
const failed = ref(false)
const saving = ref(false)
const realBalance = ref('')

const fmt = (value) => money(value, props.wallet?.currency)

const canApply = computed(() => {
  if (!info.value) return false
  if (info.value.hasOpeningBalance) return info.value.difference !== 0
  return realBalance.value !== '' && Number.isFinite(Number(realBalance.value))
})

const load = async () => {
  info.value = null
  failed.value = false
  realBalance.value = ''
  loading.value = true
  try {
    info.value = (await walletsAPI.getReconciliation(props.wallet._id)).data
  } catch {
    failed.value = true
  }
  loading.value = false
}

const apply = async () => {
  saving.value = true
  try {
    const body = info.value.hasOpeningBalance ? {} : { balance: Number(realBalance.value) }
    const { data } = await walletsAPI.recalculate(props.wallet._id, body)
    snackbar.success(t('wallets.recalc.done', { amount: fmt(data.balance) }))
    emit('recalculated', data)
    emit('update:modelValue', false)
  } catch (e) {
    snackbar.error(e.response?.data?.message || t('common.error'))
  }
  saving.value = false
}

watch(() => props.modelValue, (open) => { if (open && props.wallet) load() })
</script>

<style scoped>
.recalc-rows { display: grid; gap: 8px; }
.recalc-rows > div { display: flex; justify-content: space-between; gap: 12px; }
</style>
