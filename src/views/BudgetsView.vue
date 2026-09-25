<template>
  <div>
    <div data-tour="page-intro" class="page-intro d-flex align-start align-sm-center flex-column flex-sm-row ga-3">
      <div>
        <div class="page-intro__eyebrow">{{ t('budgets.monthlyPlan') }}</div>
        <h1 :class="isMobile ? 'text-h5' : 'text-h4'">{{ t('nav.budgets') }}</h1>
        <p class="page-intro__subtitle">{{ t('budgets.subtitle') }}</p>
      </div>
      <v-spacer />
      <v-btn v-if="!isMobile && !billingStore.isReadOnly" data-tour="page-add" color="primary" prepend-icon="mdi-plus" @click="openCreate">{{ t('budgets.newBudget') }}</v-btn>
    </div>

    <v-card v-if="!isMobile">
      <v-data-table :items="store.budgets" :headers="headers" :loading="store.loading" hover>
        <template #item.month="{ value }">{{ months[value - 1] }}</template>
        <template #item.category="{ value }">
          <span v-if="value">{{ value.icon }} {{ value.name }}</span>
          <v-chip v-else size="small">{{ t('budgets.general') }}</v-chip>
        </template>
        <template #item.amount="{ value }">{{ money(value) }}</template>
        <template #item.actions="{ item }">
          <v-icon v-if="!billingStore.isReadOnly" size="small" class="mr-2" @click="openEdit(item)">mdi-pencil</v-icon>
          <v-icon v-if="!billingStore.isReadOnly" size="small" color="error" @click="confirmDelete(item)">mdi-delete</v-icon>
        </template>
      </v-data-table>
    </v-card>

    <div v-else>
      <v-card v-if="store.budgets.length === 0 && !store.loading" class="pa-8 text-center text-grey">
        <v-icon size="x-large" color="grey">mdi-chart-pie</v-icon>
        <div class="mt-2">{{ t('budgets.noBudgets') }}</div>
      </v-card>
      <v-row v-else>
        <v-col v-for="b in store.budgets" :key="b._id" cols="12" sm="6">
          <v-card @click="!billingStore.isReadOnly && openEdit(b)">
            <v-card-title class="text-body-1">
              {{ b.category?.icon }} {{ b.category?.name || t('budgets.general') }}
            </v-card-title>
            <v-card-text>
              <div class="text-h6">{{ money(b.amount) }}</div>
              <div class="text-caption text-grey">{{ months[b.month - 1] }} {{ b.year }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <v-dialog v-model="dialog" :fullscreen="isMobile" max-width="400">
      <v-card :title="editing ? t('budgets.editBudget') : t('budgets.newBudget')" class="budget-form">
        <v-card-text>
          <MoneyField v-model="form.amount" :label="t('budgets.limitAmount')" size="hero" required />
          <v-row dense>
            <v-col cols="7"><NativeSelectField v-model="form.month" :items="monthOptions" :label="t('budgets.month')" required /></v-col>
            <v-col cols="5"><v-text-field v-model.number="form.year" :label="t('budgets.year')" type="number" variant="outlined" density="compact" required /></v-col>
          </v-row>
          <NativeSelectField v-model="form.category" :items="categories" item-title="name" item-value="_id" :label="t('budgets.categoryOptional')" :placeholder="t('budgets.general')" class="mb-2" />
          <div class="d-flex align-center mt-1">
            <AIRecommendBudget :category-id="form.category" @predicted="onBudgetPredicted" />
          </div>
        </v-card-text>
        <v-card-actions class="form-actions">
          <v-btn variant="text" @click="dialog = false">{{ t('common.cancel') }}</v-btn>
          <v-spacer />
          <v-btn class="form-actions__primary" @click="save">{{ t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ t('wallets.confirm') }}</v-card-title>
        <v-card-text>{{ t('budgets.deleteConfirm') }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="error" @click="doDelete">{{ t('common.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-btn
      v-if="isMobile && !billingStore.isReadOnly"
      icon="mdi-plus"
      color="primary"
      size="x-large"
      class="finance-fab" data-tour="page-add"
      @click="openCreate"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { useBudgetsStore } from '@/stores/budgets'
import { useSnackbar } from '@/stores/snackbar'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { useLocale } from '@/composables/useLocale'
import { categoriesAPI } from '@/api'
import AIRecommendBudget from '@/components/AIRecommendBudget.vue'
import NativeSelectField from '@/components/NativeSelectField.vue'
import MoneyField from '@/components/MoneyField.vue'

const { t, tm } = useI18n()
const { money } = useLocale()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)

const store = useBudgetsStore()
const snackbar = useSnackbar()
const billingStore = useSubscriptionStore()
const categories = ref([])
const dialog = ref(false)
const deleteDialog = ref(false)
const editing = ref(null)
const toDelete = ref(null)

const months = computed(() => tm('common.months'))
const monthOptions = computed(() => months.value.map((m, i) => ({ title: m, value: i + 1 })))
const now = new Date()
const form = ref({ month: now.getMonth() + 1, year: now.getFullYear(), amount: 0, category: null })

const headers = computed(() => [
  { title: t('budgets.month'), key: 'month' }, { title: t('budgets.year'), key: 'year' },
  { title: t('transactions.category'), key: 'category' }, { title: t('wallets.amount'), key: 'amount' },
  { title: '', key: 'actions', sortable: false, width: 80 },
])

const openCreate = () => { editing.value = null; form.value = { month: now.getMonth() + 1, year: now.getFullYear(), amount: 0, category: null }; dialog.value = true }
const openEdit = (item) => { editing.value = item._id; form.value = { month: item.month, year: item.year, amount: item.amount, category: item.category?._id || null }; dialog.value = true }

const save = async () => {
  try {
    if (editing.value) { await store.update(editing.value, { amount: form.value.amount }); snackbar.success(t('budgets.updated')) }
    else { await store.upsert(form.value); snackbar.success(t('budgets.created')) }
    dialog.value = false
  } catch { snackbar.error(t('common.error')) }
}

const confirmDelete = (item) => { toDelete.value = item._id; deleteDialog.value = true }

const onBudgetPredicted = (data) => {
  if (data.recommendedBudget) form.value.amount = data.recommendedBudget
  snackbar.info(t('budgets.aiRecommends', { amount: money(data.recommendedBudget), reasoning: data.reasoning }))
}
const doDelete = async () => { try { await store.remove(toDelete.value); snackbar.success(t('budgets.deleted')) } catch { snackbar.error(t('common.error')) }; deleteDialog.value = false }

onMounted(async () => { store.fetchAll(); const res = await categoriesAPI.getAll(); categories.value = res.data })
</script>
