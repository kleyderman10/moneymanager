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

    <v-card class="mb-2" data-tour="recurring-upcoming">
      <v-card-title :class="isMobile ? 'text-body-2' : 'text-h6'">{{ t('recurring.upcomingPayments') }}</v-card-title>
      <v-card-text v-if="store.upcoming.length === 0" class="text-center text-grey py-2">
        <div class="text-caption">{{ t('dashboard.noUpcomingPayments') }}</div>
      </v-card-text>
      <v-list v-else bg-color="transparent" density="compact">
        <v-list-item v-for="item in store.upcoming" :key="item._id" :title="item.description || item.category?.name" :subtitle="formatDate(item.nextOccurrence)">
          <template #append><span :class="item.type === 'income' ? 'text-green' : 'text-red'">{{ money(item.amount) }}</span></template>
        </v-list-item>
      </v-list>
    </v-card>

    <v-card v-if="!isMobile">
      <v-data-table :items="store.transactions" :headers="headers" :loading="store.loading" hover>
        <template #item.amount="{ value, item }">
          <span :class="item.type === 'income' ? 'text-green' : 'text-red'">{{ item.type === 'income' ? '+' : '-' }}{{ money(value) }}</span>
        </template>
        <template #item.frequency="{ value }"><v-chip size="small">{{ freqLabels[value] }}</v-chip></template>
        <template #item.category="{ value }"><span v-if="value">{{ value.icon }} {{ value.name }}</span></template>
        <template #item.actions="{ item }">
          <v-icon v-if="!billingStore.isReadOnly" size="small" class="mr-2" @click="openEdit(item)">mdi-pencil</v-icon>
          <v-icon v-if="!billingStore.isReadOnly" size="small" color="error" @click="confirmDelete(item)">mdi-delete</v-icon>
        </template>
      </v-data-table>
    </v-card>

    <div v-else>
      <v-card v-if="store.transactions.length === 0 && !store.loading" class="pa-8 text-center text-grey">
        <v-icon size="x-large" color="grey">mdi-sync-off</v-icon>
        <div class="mt-2">{{ t('recurring.noRecurring') }}</div>
      </v-card>
      <v-list v-else bg-color="transparent">
        <v-list-item v-for="tx in store.transactions" :key="tx._id" @click="!billingStore.isReadOnly && openEdit(tx)" :title="tx.description || tx.category?.name" :subtitle="freqLabels[tx.frequency] + ' · ' + t('recurring.since') + ' ' + formatDate(tx.startDate)">
          <template #prepend><v-avatar :color="tx.type === 'income' ? 'green' : 'red'" size="36"><v-icon color="white">{{ tx.type === 'income' ? 'mdi-arrow-down-bold' : 'mdi-arrow-up-bold' }}</v-icon></v-avatar></template>
          <template #append>
            <div class="text-right"><span :class="tx.type === 'income' ? 'text-green' : 'text-red'" class="font-weight-bold">{{ tx.type === 'income' ? '+' : '-' }}{{ money(tx.amount) }}</span></div>
          </template>
        </v-list-item>
      </v-list>
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

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card><v-card-title>{{ t('wallets.confirm') }}</v-card-title><v-card-text>{{ t('recurring.deleteConfirm') }}</v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="deleteDialog = false">{{ t('common.cancel') }}</v-btn><v-btn color="error" @click="doDelete">{{ t('common.delete') }}</v-btn></v-card-actions></v-card>
    </v-dialog>

    <v-btn v-if="isMobile && !billingStore.isReadOnly" icon="mdi-plus" color="primary" size="x-large" class="finance-fab" data-tour="page-add" @click="openCreate" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { useRecurringStore } from '@/stores/recurring'
import { useSnackbar } from '@/stores/snackbar'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { useLocale } from '@/composables/useLocale'
import { categoriesAPI, walletsAPI } from '@/api'
import NativeSelectField from '@/components/NativeSelectField.vue'
import MoneyField from '@/components/MoneyField.vue'

const { t } = useI18n()
const { money, date } = useLocale()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const store = useRecurringStore()
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
  { title: t('recurring.start'), key: 'startDate' }, { title: '', key: 'actions', sortable: false, width: 80 },
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

onMounted(async () => { store.fetchAll(); store.fetchUpcoming(); const [catRes, walRes] = await Promise.all([categoriesAPI.getAll(), walletsAPI.getAll()]); categories.value = catRes.data; wallets.value = walRes.data })
</script>
