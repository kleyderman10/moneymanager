<template>
  <div>
    <div data-tour="page-intro" class="page-intro d-flex align-start align-sm-center flex-column flex-sm-row ga-3">
      <div>
        <div class="page-intro__eyebrow">{{ t('recurring.automation') }}</div>
        <h1 :class="isMobile ? 'text-h5' : 'text-h4'">{{ t('nav.recurring') }}</h1>
        <p class="page-intro__subtitle">{{ t('recurring.subtitle') }}</p>
      </div>
      <v-spacer />
      <v-btn v-if="!isMobile && !billingStore.isReadOnly" data-tour="page-add" color="primary" prepend-icon="mdi-plus" @click="openCreate">{{ t('recurring.newRecurring') }}</v-btn>
    </div>

    <v-card class="kf-card-hero mb-4" data-tour="recurring-upcoming">
      <v-card-title class="d-flex align-center ga-3 upcoming__title">
        <span class="kf-icon-tile"><v-icon size="20">mdi-calendar-clock</v-icon></span>
        <span class="text-body-1 font-weight-bold">{{ t('recurring.upcomingPayments') }}</span>
      </v-card-title>
      <v-card-text v-if="store.upcoming.length === 0" class="text-center text-medium-emphasis py-3">
        <div class="text-body-2">{{ t('dashboard.noUpcomingPayments') }}</div>
      </v-card-text>
      <div v-else class="upcoming__list">
        <div v-for="item in store.upcoming" :key="item._id" class="upcoming__item">
          <span class="kf-icon-tile" :class="item.type === 'income' ? 'kf-icon-tile--income' : 'kf-icon-tile--expense'">
            <v-icon size="18">{{ categoryIcon(item.category) }}</v-icon>
          </span>
          <div class="kf-row__body">
            <div class="kf-row__title">{{ item.description || item.category?.name }}</div>
            <div class="kf-row__meta">{{ formatDate(item.nextOccurrence) }}</div>
          </div>
          <span class="kf-amount" :class="item.type === 'income' ? 'kf-income' : 'kf-expense'">{{ money(item.amount) }}</span>
        </div>
      </div>
    </v-card>

    <v-card v-if="!isMobile">
      <v-data-table :items="store.transactions" :headers="headers" :loading="store.loading" hover>
        <template #item.amount="{ value, item }">
          <span class="kf-amount" :class="item.type === 'income' ? 'kf-income' : 'kf-expense'">{{ item.type === 'income' ? '+' : '-' }}{{ money(value) }}</span>
        </template>
        <template #item.frequency="{ value }"><v-chip size="small">{{ freqLabels[value] }}</v-chip></template>
        <template #item.category="{ value }"><span v-if="value"><v-icon :icon="categoryIcon(value)" size="18" /> {{ value.name }}</span></template>
        <template #item.actions="{ item }">
          <div v-if="!billingStore.isReadOnly" class="d-flex flex-nowrap justify-end ga-1">
            <v-btn icon="mdi-pencil-outline" variant="text" size="small" :aria-label="t('common.edit')" @click="openEdit(item)" />
            <v-btn icon="mdi-delete-outline" variant="text" size="small" color="error" :aria-label="t('common.delete')" @click="confirmDelete(item)" />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <div v-else>
      <v-card v-if="store.transactions.length === 0 && !store.loading" class="pa-8 text-center text-grey">
        <v-icon size="x-large" color="grey">mdi-sync-off</v-icon>
        <div class="mt-2">{{ t('recurring.noRecurring') }}</div>
      </v-card>
      <template v-else>
        <component
          :is="billingStore.isReadOnly ? 'div' : 'button'"
          v-for="tx in store.transactions"
          :key="tx._id"
          :type="billingStore.isReadOnly ? undefined : 'button'"
          class="kf-row recurring-row"
          @click="!billingStore.isReadOnly && openEdit(tx)"
        >
          <span class="kf-icon-tile" :class="tx.type === 'income' ? 'kf-icon-tile--income' : 'kf-icon-tile--expense'">
            <v-icon size="20">{{ categoryIcon(tx.category) }}</v-icon>
          </span>
          <span class="kf-row__body">
            <span class="kf-row__title d-block">{{ tx.description || tx.category?.name }}</span>
            <span class="kf-row__meta d-block">{{ freqLabels[tx.frequency] }} · {{ t('recurring.since') }} {{ formatDate(tx.startDate) }}</span>
          </span>
          <span class="kf-row__end kf-amount" :class="tx.type === 'income' ? 'kf-income' : 'kf-expense'">{{ tx.type === 'income' ? '+' : '-' }}{{ money(tx.amount) }}</span>
          <v-icon v-if="!billingStore.isReadOnly" size="18" class="text-medium-emphasis">mdi-chevron-right</v-icon>
        </component>
      </template>
    </div>

    <v-dialog v-model="dialog" :fullscreen="isMobile" max-width="500">
      <v-card :title="editing ? t('recurring.editRecurring') : t('recurring.newRecurringTitle')" class="capture-form">
        <v-card-text>
          <label class="form-label">{{ t('transactions.type') }}</label>
          <div class="segmented-toggle mb-3">
            <button
              type="button"
              class="segmented-toggle__option segmented-toggle__option--expense"
              :class="{ 'segmented-toggle__option--active': form.type === 'expense' }"
              @click="onTypeChange('expense')"
            >
              {{ t('transactions.expense') }}
            </button>
            <button
              type="button"
              class="segmented-toggle__option segmented-toggle__option--income"
              :class="{ 'segmented-toggle__option--active': form.type === 'income' }"
              @click="onTypeChange('income')"
            >
              {{ t('transactions.income') }}
            </button>
          </div>

          <MoneyField v-model="form.amount" :label="t('wallets.amount')" size="hero" required />

          <NativeSelectField v-model="form.category" :items="filteredCategories" item-title="name" item-value="_id" :label="t('transactions.category')" :placeholder="t('transactions.selectCategory')" :error="attemptedSave && !form.category" required class="mb-2" />
          <v-text-field v-model="form.description" :label="t('transactions.description')" variant="outlined" density="compact" class="mb-3" />
          <NativeSelectField v-model="form.frequency" :items="freqOptions" :label="t('recurring.frequency')" required class="mb-2" />
          <v-row dense>
            <v-col cols="6"><v-text-field v-model="form.startDate" :label="t('recurring.startDate')" type="date" variant="outlined" density="compact" required /></v-col>
            <v-col cols="6"><v-text-field v-model="form.endDate" :label="t('recurring.endDateOptional')" type="date" variant="outlined" density="compact" /></v-col>
          </v-row>
          <NativeSelectField v-model="form.wallet" :items="wallets" item-title="name" item-value="_id" :label="t('transactions.account')" :placeholder="t('transactions.noAccount')" />
        </v-card-text>
        <v-card-actions class="form-actions">
          <v-btn variant="text" @click="dialog = false">{{ t('common.cancel') }}</v-btn>
          <v-spacer />
          <v-btn class="form-actions__primary" @click="save">{{ t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDialog
      v-model="deleteDialog"
      :message="t('recurring.deleteConfirm')"
      @confirm="doDelete"
    />

    <v-btn v-if="isMobile && !billingStore.isReadOnly" icon="mdi-plus" color="primary" size="x-large" class="finance-fab" :aria-label="t('recurring.newRecurring')" data-tour="page-add" @click="openCreate" />
  </div>
</template>

<script setup>
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { categoryIcon } from '@/utils/categoryIcon'
import { ref, computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { useRecurringStore } from '@/stores/recurring'
import { useSnackbar } from '@/stores/snackbar'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { useLocale } from '@/composables/useLocale'
import { walletsAPI } from '@/api'
import { useCategoriesStore } from '@/stores/categories'
import NativeSelectField from '@/components/NativeSelectField.vue'
import MoneyField from '@/components/MoneyField.vue'

const { t } = useI18n()
const { money, date } = useLocale()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const store = useRecurringStore()
const categoriesStore = useCategoriesStore()
const snackbar = useSnackbar()
const billingStore = useSubscriptionStore()
const categories = ref([])
const wallets = ref([])
const dialog = ref(false)
const deleteDialog = ref(false)
const editing = ref(null)
const toDelete = ref(null)
const attemptedSave = ref(false)

const freqLabels = computed(() => ({
  daily: t('recurring.daily'),
  weekly: t('recurring.weekly'),
  monthly: t('recurring.monthly'),
  yearly: t('recurring.yearly'),
}))
const freqOptions = computed(() => [
  { title: t('recurring.daily'), value: 'daily' },
  { title: t('recurring.weekly'), value: 'weekly' },
  { title: t('recurring.monthly'), value: 'monthly' },
  { title: t('recurring.yearly'), value: 'yearly' },
])
const form = ref({ type: 'expense', amount: 0, category: null, description: '', frequency: 'monthly', startDate: new Date().toISOString().slice(0, 10), endDate: null, wallet: null })

const headers = computed(() => [
  { title: t('transactions.description'), key: 'description' }, { title: t('transactions.category'), key: 'category' },
  { title: t('wallets.amount'), key: 'amount' }, { title: t('recurring.frequency'), key: 'frequency' },
  { title: t('recurring.start'), key: 'startDate' }, { title: '', key: 'actions', sortable: false, width: 112 },
])

const formatDate = (d) => d ? date(d) : ''

const filteredCategories = computed(() => categories.value.filter(c => !form.value.type || c.type === form.value.type))
const onTypeChange = (value) => { form.value.type = value; form.value.category = null }

const openCreate = () => {
  editing.value = null
  attemptedSave.value = false
  form.value = {
    type: 'expense',
    amount: 0,
    category: null,
    description: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: null,
    // Same "última cuenta usada" preference Movimientos remembers, so the default is
    // consistent wherever a wallet needs to be picked.
    wallet: localStorage.getItem('mm_last_wallet') || wallets.value[0]?._id || null,
  }
  dialog.value = true
}
const openEdit = (item) => { editing.value = item._id; attemptedSave.value = false; form.value = { type: item.type, amount: item.amount, category: item.category?._id || null, description: item.description, frequency: item.frequency, startDate: item.startDate ? new Date(item.startDate).toISOString().slice(0, 10) : '', endDate: item.endDate ? new Date(item.endDate).toISOString().slice(0, 10) : null, wallet: item.wallet?._id || null }; dialog.value = true }

const save = async () => {
  attemptedSave.value = true
  if (!form.value.category) { snackbar.error(t('transactions.selectCategoryError')); return }

  const payload = { ...form.value, endDate: form.value.endDate || null }
  try {
    if (editing.value) { await store.update(editing.value, payload); snackbar.success(t('budgets.updated')) }
    else { await store.create(payload); snackbar.success(t('recurring.created')) }
    store.fetchUpcoming()
    dialog.value = false
  } catch (err) { snackbar.error(err?.response?.data?.message || t('transactions.saveError')) }
}

const confirmDelete = (item) => { toDelete.value = item._id; deleteDialog.value = true }
const doDelete = async () => { try { await store.remove(toDelete.value); snackbar.success(t('budgets.deleted')); store.fetchUpcoming() } catch (err) { snackbar.error(err?.response?.data?.message || t('transactions.deleteError')) }; deleteDialog.value = false }

onMounted(async () => { store.fetchAll(); store.fetchUpcoming(); const [cats, walRes] = await Promise.all([categoriesStore.fetchCached(), walletsAPI.getAll()]); categories.value = cats; wallets.value = walRes.data })
</script>

<style scoped>
.upcoming__title { padding: 16px 18px 8px !important; }
.upcoming__list { padding: 4px 12px 14px; }
.upcoming__item { display: flex; align-items: center; gap: 12px; padding: 8px 6px; }
.upcoming__item + .upcoming__item { border-top: 1px solid var(--kf-divider); }
.recurring-row { width: 100%; font: inherit; text-align: left; cursor: pointer; }
div.recurring-row { cursor: default; }
</style>
