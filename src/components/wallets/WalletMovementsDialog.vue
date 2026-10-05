<template>
  <v-dialog :model-value="modelValue" :fullscreen="mobile" max-width="640" scrollable @update:model-value="emit('update:modelValue', $event)">
    <v-card :title="t('wallets.movements.title', { name: wallet?.name || '' })">
      <v-card-text>
        <KfSegmented v-model="mode" :options="modeOptions" block class="mb-3" />
        <div v-if="mode === 'month'" class="d-flex align-center ga-1 mb-3">
          <v-btn icon="mdi-chevron-left" size="small" variant="text" :aria-label="t('wallets.movements.prevMonth')" @click="shiftMonth(-1)" />
          <v-text-field v-model="month" type="month" density="compact" hide-details variant="outlined" :aria-label="t('wallets.movements.month')" />
          <v-btn icon="mdi-chevron-right" size="small" variant="text" :aria-label="t('wallets.movements.nextMonth')" @click="shiftMonth(1)" />
        </div>
        <div class="movements-summary">
          <div><span>{{ t('wallets.balance') }}</span><strong>{{ fmt(wallet?.balance) }}</strong></div>
          <div><span>{{ t('transactions.incomePlural') }}</span><strong class="kf-income">{{ fmt(totals.income) }}</strong></div>
          <div><span>{{ t('transactions.expensePlural') }}</span><strong class="kf-expense">{{ fmt(totals.expense) }}</strong></div>
        </div>

        <div v-if="loading" class="text-center pa-6"><v-progress-circular indeterminate /></div>
        <v-alert v-else-if="failed" type="warning" variant="tonal" :text="t('common.loadError')">
          <template #append><v-btn variant="text" @click="load">{{ t('common.retry') }}</v-btn></template>
        </v-alert>
        <div v-else-if="!items.length" class="text-medium-emphasis text-center pa-4">{{ t('wallets.movements.empty') }}</div>
        <v-list v-else lines="two" bg-color="transparent">
          <v-list-item v-for="m in items" :key="m._id" class="px-0">
            <v-list-item-title class="text-wrap">
              {{ m.description || m.category?.name || '—' }}
              <v-chip v-if="m.cardPayment" size="x-small" class="ml-1" color="info" variant="tonal">{{ t('wallets.movements.cardPayment') }}</v-chip>
            </v-list-item-title>
            <v-list-item-subtitle>{{ formatDate(m.date) }}<span v-if="m.category?.name"> · {{ m.category.name }}</span></v-list-item-subtitle>
            <template #append>
              <strong class="kf-amount text-no-wrap" :class="m.type === 'income' ? 'kf-income' : 'kf-expense'">
                {{ m.type === 'income' ? '+' : '-' }}{{ fmt(m.amount) }}
              </strong>
            </template>
          </v-list-item>
        </v-list>

        <div v-if="mode !== 'recent' && pages > 1" class="d-flex align-center justify-center ga-2">
          <v-btn icon="mdi-chevron-left" size="small" variant="text" :aria-label="t('common.back')" :disabled="page <= 1" @click="page--" />
          <span class="text-caption">{{ page }} / {{ pages }}</span>
          <v-btn icon="mdi-chevron-right" size="small" variant="text" :aria-label="t('common.next')" :disabled="page >= pages" @click="page++" />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" prepend-icon="mdi-open-in-new" @click="openInTransactions">{{ t('wallets.movements.viewAll') }}</v-btn>
        <v-btn v-if="!readOnly" variant="text" prepend-icon="mdi-calculator-variant-outline" @click="reconcileOpen = true">{{ t('wallets.recalc.button') }}</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">{{ t('common.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <WalletReconcileDialog v-model="reconcileOpen" :wallet="wallet" @recalculated="onRecalculated" />
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import { registersAPI } from '@/api'
import { useLocale } from '@/composables/useLocale'
import KfSegmented from '@/components/ui/KfSegmented.vue'
import WalletReconcileDialog from '@/components/wallets/WalletReconcileDialog.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  wallet: { type: Object, default: null },
  readOnly: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'recalculated'])

const { t } = useI18n()
const { money, date } = useLocale()
const { mobile } = useDisplay()
const router = useRouter()

const PAGE_SIZE = 20
const RECENT_SIZE = 10

// month: movements of the chosen month (this month by default) · recent: the latest ones · all.
const mode = ref('month')
const currentMonth = () => new Date().toISOString().slice(0, 7)
const month = ref(currentMonth())
const modeOptions = computed(() => [
  { value: 'month', label: t('wallets.movements.modeMonth') },
  { value: 'recent', label: t('wallets.movements.modeRecent') },
  { value: 'all', label: t('wallets.movements.modeAll') },
])

const monthRange = () => {
  const [year, monthNumber] = month.value.split('-').map(Number)
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const pad = (n) => String(n).padStart(2, '0')
  return { startDate: `${year}-${pad(monthNumber)}-01`, endDate: `${year}-${pad(monthNumber)}-${pad(last)}` }
}
const hasValidMonth = () => /^\d{4}-\d{2}$/.test(month.value || '')

const shiftMonth = (delta) => {
  const [year, monthNumber] = (hasValidMonth() ? month.value : currentMonth()).split('-').map(Number)
  month.value = new Date(Date.UTC(year, monthNumber - 1 + delta, 1)).toISOString().slice(0, 7)
}
const items = ref([])
const totals = ref({ income: 0, expense: 0 })
const page = ref(1)
const pages = ref(1)
const loading = ref(false)
const failed = ref(false)
const reconcileOpen = ref(false)

const fmt = (value) => money(value, props.wallet?.currency)
const formatDate = (value) => (value ? date(value, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '')

const load = async () => {
  loading.value = true
  failed.value = false
  try {
    const params = { wallet: props.wallet._id, page: mode.value === 'recent' ? 1 : page.value, limit: mode.value === 'recent' ? RECENT_SIZE : PAGE_SIZE }
    if (mode.value === 'month') {
      if (!hasValidMonth()) { loading.value = false; return }
      Object.assign(params, monthRange())
    }
    const { data } = await registersAPI.getAll(params)
    items.value = data.items
    totals.value = data.totals
    pages.value = data.pages
    if (data.page !== page.value) page.value = data.page
  } catch {
    failed.value = true
  }
  loading.value = false
}

const openInTransactions = () => {
  emit('update:modelValue', false)
  const query = { wallet: props.wallet._id }
  if (mode.value === 'month' && hasValidMonth()) Object.assign(query, { from: monthRange().startDate, to: monthRange().endDate })
  router.push({ path: '/transactions', query })
}

const onRecalculated = (result) => {
  emit('recalculated', result)
  load()
}

const reload = () => {
  if (page.value !== 1) page.value = 1
  else load()
}
watch(() => props.modelValue, (open) => {
  if (!open || !props.wallet) return
  mode.value = 'month'
  month.value = currentMonth()
  reload()
})
watch([mode, month], () => { if (props.modelValue && props.wallet) reload() })
watch(page, () => { if (props.modelValue && props.wallet) load() })
</script>

<style scoped>
.movements-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.movements-summary > div { display: flex; flex-direction: column; }
.movements-summary span { font-size: 0.75rem; opacity: 0.72; }
</style>
