<template>
  <div>
    <div class="page-intro d-flex align-start align-sm-center flex-column flex-sm-row ga-3">
      <div>
        <div class="page-intro__eyebrow">{{ t('credits.debtUnderControl') }}</div>
        <h1 :class="isMobile ? 'text-h5' : 'text-h4'">{{ t('credits.myCredits') }}</h1>
        <p class="page-intro__subtitle">{{ t('credits.subtitle') }}</p>
      </div>
      <v-spacer />
      <v-btn v-if="!isMobile && !billingStore.isReadOnly" color="primary" prepend-icon="mdi-plus" @click="openCreate">{{ t('credits.registerCredit') }}</v-btn>
    </div>

    <v-card v-if="store.credits.length === 0 && !store.loading" class="pa-8 text-center text-grey">
      <v-icon size="x-large" color="primary">mdi-bank-plus</v-icon>
      <div class="mt-2 text-body-1">{{ t('credits.noCreditsYet') }}</div>
      <div class="text-caption mt-1">{{ t('credits.noCreditsHint') }}</div>
      <v-btn v-if="!billingStore.isReadOnly" color="primary" variant="text" class="mt-3" @click="openCreate">{{ t('credits.registerFirst') }}</v-btn>
    </v-card>

    <v-row v-else>
      <v-col v-for="credit in store.credits" :key="credit._id" cols="12" md="6" xl="4">
        <v-card class="credit-card" :class="{ 'credit-card--paid': credit.summary?.status === 'paid_off' }">
          <v-card-title class="d-flex align-center">
            <v-avatar v-if="credit.institutionLogo" size="38" class="mr-3"><img :src="credit.institutionLogo" :alt="credit.institutionName || credit.lender || 'Entidad financiera'" /></v-avatar>
            <v-avatar v-else color="secondary" variant="tonal" size="38" class="mr-3"><v-icon>mdi-bank-minus</v-icon></v-avatar>
            <div class="min-w-0">
              <div class="text-subtitle-1 text-truncate">{{ credit.name }}</div>
              <div class="text-caption text-medium-emphasis">{{ credit.institutionName || credit.lender || typeLabels[credit.type] }}</div>
            </div>
            <v-spacer />
            <v-chip size="small" :color="credit.summary?.status === 'paid_off' ? 'success' : credit.status === 'paused' ? 'warning' : 'primary'" variant="tonal">
              {{ statusLabels[credit.summary?.status || credit.status] || credit.status }}
            </v-chip>
          </v-card-title>

          <v-card-text>
            <div class="credit-balance-label">{{ t('credits.capitalBalance') }}</div>
            <div :class="isMobile ? 'text-h5' : 'text-h4'" class="font-weight-bold">{{ money(credit.summary?.capitalBalance ?? credit.capitalBalance ?? credit.outstandingBalance, credit.currency) }}</div>
            <div class="text-caption text-medium-emphasis mt-1">{{ t('credits.totalBalance', { kind: credit.summary?.interestIsEstimated ? t('credits.estimated') : t('credits.current') }) }}: <strong>{{ money(credit.summary?.totalBalance, credit.currency) }}</strong> {{ t('credits.capitalPlusInterest') }}</div>
            <v-progress-linear class="mt-3" color="primary" rounded height="8" :model-value="credit.summary?.progress || 0" />
            <div class="d-flex justify-space-between text-caption text-medium-emphasis mt-1">
              <span>{{ t('credits.paidPercent', { percent: percent(credit.summary?.progress) }) }}</span>
              <span>{{ t('credits.remainingInstallments', { count: credit.summary?.remainingInstallments || 0 }) }}</span>
            </div>

            <div class="credit-metrics mt-4">
              <div><span>{{ t('credits.registeredInstallment') }}</span><strong>{{ money(credit.installmentAmount, credit.currency) }}</strong></div>
              <div><span>{{ t('credits.currentInterest') }}</span><strong>{{ money(credit.summary?.currentInterest, credit.currency) }}</strong></div>
              <div><span>{{ t('credits.remainingInterest') }}</span><strong>{{ money(credit.summary?.totalRemainingInterest, credit.currency) }}</strong></div>
              <div><span>{{ t('credits.installmentsPaid') }}</span><strong>{{ credit.installmentsPaid }} / {{ credit.termMonths }}</strong></div>
            </div>

            <div v-if="credit.summary?.calculation" class="text-caption text-medium-emphasis mt-3">
              {{ t('credits.registeredAnnualRate') }}: <strong>{{ number(credit.annualInterestRate || 0, { maximumFractionDigits: 4 }) }}%</strong>
              · {{ t('credits.equivalentMonthlyRate') }}: <strong>{{ number(credit.summary.calculation.monthlyRate || 0, { maximumFractionDigits: 4 }) }}%</strong>
            </div>

            <v-alert v-if="credit.summary?.calculation?.warnings?.length" class="mt-3" type="warning" variant="tonal" density="compact">
              <ul class="credit-advice"><li v-for="warning in credit.summary.calculation.warnings" :key="warning">{{ warning }}</li></ul>
            </v-alert>

            <v-alert v-if="credit.summary?.nextPaymentDate && credit.summary.status !== 'paid_off'" class="mt-3" :type="credit.summary.daysUntilNextPayment < 0 ? 'error' : credit.summary.daysUntilNextPayment <= 7 ? 'warning' : 'info'" variant="tonal" density="compact">
              <strong>{{ credit.summary.daysUntilNextPayment < 0 ? t('credits.paymentOverdue', { days: Math.abs(credit.summary.daysUntilNextPayment) }) : t('credits.nextPayment', { date: formatDate(credit.summary.nextPaymentDate) }) }}</strong>
              <span v-if="credit.summary.daysUntilNextPayment >= 0"> · {{ money(credit.installmentAmount || credit.summary.nextPaymentAmount, credit.currency) }}</span>
            </v-alert>

            <v-alert v-if="credit.summary?.advice?.length" class="mt-3" type="success" variant="tonal" density="compact">
              <ul class="credit-advice"><li v-for="tip in credit.summary.advice.slice(0, 2)" :key="tip">{{ tip }}</li></ul>
            </v-alert>

            <v-expansion-panels variant="accordion" class="mt-3">
              <v-expansion-panel :title="t('credits.viewPaymentPlan')">
                <v-expansion-panel-text>
                  <div v-if="credit.paymentPlan?.length" class="plan-scroll">
                    <v-table density="compact">
                      <thead><tr><th>{{ t('credits.installment') }}</th><th>{{ t('transactions.date') }}</th><th class="text-right">{{ t('credits.payment') }}</th><th class="text-right">{{ t('credits.interest') }}</th><th class="text-right">{{ t('credits.capitalBalanceShort') }}</th></tr></thead>
                      <tbody>
                        <tr v-for="row in credit.paymentPlan" :key="row.period">
                          <td>{{ credit.installmentsPaid + row.period }}</td>
                          <td>{{ formatDate(row.dueDate) }}</td>
                          <td class="text-right">{{ money(row.payment, credit.currency) }}</td>
                          <td class="text-right">{{ money(row.interest, credit.currency) }}</td>
                          <td class="text-right">{{ money(row.balance, credit.currency) }}</td>
                        </tr>
                      </tbody>
                    </v-table>
                    <div class="text-caption text-medium-emphasis mt-2">{{ t('credits.showingInstallments', { count: credit.paymentPlan.length }) }}</div>
                  </div>
                  <div v-else class="text-caption text-medium-emphasis">{{ t('credits.noPendingInstallments') }}</div>
                </v-expansion-panel-text>
              </v-expansion-panel>
              <v-expansion-panel :title="t('credits.paymentHistory')">
                <v-expansion-panel-text>
                  <v-list v-if="credit.payments?.length" density="compact" bg-color="transparent">
                    <v-list-item v-for="payment in credit.payments.slice(0, 8)" :key="payment._id" :title="formatDate(payment.date)" :subtitle="payment.paymentType === 'extra' ? t('credits.extraPayment') : t('credits.installmentPayment')">
                      <template #append>
                        <span class="text-green mr-2">{{ money(payment.amount, credit.currency) }}</span>
                        <v-btn v-if="!billingStore.isReadOnly" icon="mdi-delete-outline" size="x-small" variant="text" color="error" @click="removePayment(credit, payment)" />
                      </template>
                    </v-list-item>
                  </v-list>
                  <div v-else class="text-caption text-medium-emphasis">{{ t('credits.noPaymentsYet') }}</div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>

          <v-card-actions>
            <v-btn v-if="!billingStore.isReadOnly && credit.summary?.status !== 'paid_off'" size="small" color="primary" variant="tonal" prepend-icon="mdi-cash-check" @click="openPayment(credit)">{{ t('credits.registerPayment') }}</v-btn>
            <v-spacer />
            <v-btn v-if="!billingStore.isReadOnly" size="small" variant="text" icon="mdi-pencil" @click="openEdit(credit)" />
            <v-btn v-if="!billingStore.isReadOnly" size="small" variant="text" icon="mdi-delete" color="error" @click="confirmDelete(credit)" />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" :fullscreen="isMobile" max-width="620">
      <v-card :title="editing ? t('credits.editCredit') : t('credits.registerCredit')" class="capture-form">
        <v-card-text>
          <div class="wizard-progress">
            <template v-for="(label, idx) in wizardSteps" :key="label">
              <div class="wizard-progress__step" :class="{ 'wizard-progress__step--active': wizardStep === idx + 1, 'wizard-progress__step--done': wizardStep > idx + 1 }">
                <v-icon v-if="wizardStep > idx + 1" size="16">mdi-check</v-icon>
                <template v-else>{{ idx + 1 }}</template>
              </div>
              <div v-if="idx < wizardSteps.length - 1" class="wizard-progress__line" :class="{ 'wizard-progress__line--done': wizardStep > idx + 1 }" />
            </template>
          </div>
          <div class="wizard-step-title">{{ t('credits.stepOf', { step: wizardStep, total: wizardSteps.length, label: wizardSteps[wizardStep - 1] }) }}</div>

          <v-window v-model="wizardStep">
            <v-window-item :value="1">
              <v-text-field v-model="form.name" :label="t('credits.creditName')" variant="outlined" density="compact" required class="mb-3" />
              <NativeSelectField v-model="form.institutionCode" :items="institutionOptions" item-title="name" item-value="code" :label="t('wallets.financialInstitution')" :placeholder="t('wallets.selectInstitution')" @update:model-value="onInstitutionChange" class="mb-2" />
              <v-text-field v-if="form.institutionCode === 'other'" v-model="form.institutionName" :label="t('wallets.institutionName')" variant="outlined" density="compact" class="mb-3" />
              <div class="d-flex align-center ga-1">
                <label class="form-label mb-0">{{ t('credits.creditType') }}</label>
                <v-icon size="15" color="grey" class="help-icon">mdi-help-circle-outline</v-icon>
                <v-tooltip activator="parent" location="top" max-width="260">{{ t('credits.creditTypeHelp') }}</v-tooltip>
              </div>
              <NativeSelectField v-model="form.type" :items="typeOptions" :label="t('credits.creditType')" class="mb-2" />
              <v-row dense>
                <v-col cols="6"><v-text-field v-model="form.currency" :label="t('wallets.currency')" variant="outlined" density="compact" maxlength="3" /></v-col>
                <v-col cols="6"><v-text-field v-model.number="form.termMonths" :label="t('credits.termMonths')" type="number" min="1" max="360" variant="outlined" density="compact" /></v-col>
              </v-row>
              <MoneyField v-model="form.principalAmount" :label="t('credits.originalAmount')" size="hero" />
            </v-window-item>

            <v-window-item :value="2">
              <MoneyField v-model="form.capitalBalance" :label="t('credits.currentCapitalBalance')" size="hero" :hint="t('credits.currentCapitalBalanceHint')" />
              <MoneyField v-model="form.interestBalance" :label="t('credits.currentPendingInterest')" :hint="t('credits.currentPendingInterestHint')" />
              <MoneyField v-model="form.installmentAmount" :label="t('credits.monthlyInstallment')" />
              <v-row dense class="mt-1">
                <v-col cols="6"><v-text-field v-model.number="form.annualInterestRate" :label="t('credits.rate')" type="number" min="0" step="0.01" variant="outlined" density="compact" suffix="%" /></v-col>
                <v-col cols="6"><v-text-field v-model.number="form.installmentsPaid" :label="t('credits.installmentsPaid')" type="number" min="0" variant="outlined" density="compact" /></v-col>
              </v-row>
              <div class="d-flex align-center ga-1">
                <label class="form-label mb-0">{{ t('credits.ratePeriod') }}</label>
                <v-icon size="15" color="grey" class="help-icon">mdi-help-circle-outline</v-icon>
                <v-tooltip activator="parent" location="top" max-width="260">{{ t('credits.ratePeriodHelp') }}</v-tooltip>
              </div>
              <NativeSelectField v-model="form.ratePeriod" :items="rateOptions" :label="t('credits.ratePeriod')" />
            </v-window-item>

            <v-window-item :value="3">
              <v-row dense>
                <v-col cols="12" sm="6"><v-text-field v-model="form.startDate" :label="t('credits.startDate')" type="date" variant="outlined" density="compact" /></v-col>
                <v-col cols="12" sm="6"><v-text-field v-model="form.firstPaymentDate" :label="t('credits.firstPayment')" type="date" variant="outlined" density="compact" /></v-col>
                <v-col cols="12" sm="6"><v-text-field v-model="form.nextPaymentDate" :label="t('credits.nextPaymentField')" type="date" variant="outlined" density="compact" /></v-col>
                <v-col cols="12" sm="6"><v-text-field v-model.number="form.paymentDay" :label="t('credits.usualPaymentDay')" type="number" min="1" max="28" variant="outlined" density="compact" /></v-col>
              </v-row>
              <v-textarea v-model="form.notes" :label="t('credits.notes')" rows="2" variant="outlined" density="compact" class="mt-2" />
            </v-window-item>
          </v-window>
        </v-card-text>
        <v-card-actions class="form-actions">
          <v-btn variant="text" @click="dialog = false">{{ t('common.cancel') }}</v-btn>
          <v-spacer />
          <v-btn v-if="wizardStep > 1" variant="text" @click="wizardStep--">{{ t('credits.back') }}</v-btn>
          <v-btn
            v-if="wizardStep < wizardSteps.length"
            class="form-actions__primary"
            append-icon="mdi-arrow-right"
            :disabled="wizardStep === 1 && !form.name"
            @click="wizardStep++"
          >
            {{ t('common.next') }}
          </v-btn>
          <v-btn v-else class="form-actions__primary" :loading="saving" @click="save">{{ t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="paymentDialog" :fullscreen="isMobile" max-width="500">
      <v-card :title="t('credits.registerPaymentFor', { name: paymentCredit?.name || '' })">
        <v-card-text>
          <v-alert v-if="paymentCredit" type="info" variant="tonal" density="compact" class="mb-4">{{ t('credits.capitalBalance') }}: <strong>{{ money(paymentCredit.summary?.capitalBalance, paymentCredit.currency) }}</strong> · {{ t('credits.currentTotal') }}: <strong>{{ money(paymentCredit.summary?.totalBalance, paymentCredit.currency) }}</strong></v-alert>
          <v-text-field v-model.number="paymentForm.amount" :label="t('credits.amountPaid')" type="number" min="0" density="compact" prefix="$" required />
          <v-text-field v-model.number="paymentForm.interestAmount" :label="t('credits.interestPortionOptional')" type="number" min="0" density="compact" prefix="$" :hint="t('credits.interestPortionHint')" persistent-hint />
          <NativeSelectField v-model="paymentForm.paymentType" :items="paymentTypeOptions" :label="t('credits.paymentTypeLabel')" />
          <v-text-field v-model="paymentForm.date" :label="t('credits.paymentDate')" type="date" density="compact" />
          <NativeSelectField v-model="paymentForm.wallet" :items="wallets" item-title="name" item-value="_id" :label="t('credits.paidFromAccount')" :placeholder="t('credits.dontDiscountAccount')" />
          <v-text-field v-model="paymentForm.description" :label="t('transactions.description')" density="compact" />
          <v-textarea v-model="paymentForm.notes" :label="t('credits.notes')" rows="2" density="compact" />
          <div class="text-caption text-medium-emphasis">{{ t('credits.paymentRecordedHint') }}</div>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="paymentDialog = false">{{ t('common.cancel') }}</v-btn><v-btn color="primary" :loading="paymentSaving" @click="savePayment">{{ t('credits.savePayment') }}</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card :title="t('credits.deleteCredit')"><v-card-text>{{ t('credits.deleteCreditConfirm') }}</v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="deleteDialog = false">{{ t('common.cancel') }}</v-btn><v-btn color="error" :loading="deleting" @click="doDelete">{{ t('common.delete') }}</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-btn v-if="isMobile && !billingStore.isReadOnly" icon="mdi-plus" color="primary" size="x-large" class="finance-fab" @click="openCreate" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { useCreditsStore } from '@/stores/credits'
import { useSnackbar } from '@/stores/snackbar'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { useLocale } from '@/composables/useLocale'
import { walletsAPI, financialInstitutionsAPI } from '@/api'
import NativeSelectField from '@/components/NativeSelectField.vue'
import MoneyField from '@/components/MoneyField.vue'

const { t } = useI18n()
const { money, number, date } = useLocale()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const store = useCreditsStore()
const snackbar = useSnackbar()
const billingStore = useSubscriptionStore()
const wallets = ref([])
const institutions = ref([])
const wizardSteps = computed(() => [t('credits.stepCreditData'), t('credits.stepBalanceAndRates'), t('credits.stepDatesAndNotes')])
const wizardStep = ref(1)
const dialog = ref(false)
const paymentDialog = ref(false)
const deleteDialog = ref(false)
const editing = ref(null)
const deleting = ref(false)
const toDelete = ref(null)
const paymentCredit = ref(null)
const saving = ref(false)
const paymentSaving = ref(false)

const typeLabels = computed(() => ({
  personal: t('credits.typePersonal'),
  vehicle: t('credits.typeVehicle'),
  mortgage: t('credits.typeMortgage'),
  education: t('credits.typeEducation'),
  business: t('credits.typeBusiness'),
  other: t('credits.typeOther'),
}))
const statusLabels = computed(() => ({
  active: t('credits.statusActive'),
  paused: t('credits.statusPaused'),
  paid_off: t('credits.statusPaidOff'),
}))
const typeOptions = computed(() => Object.entries(typeLabels.value).map(([value, title]) => ({ value, title })))
const rateOptions = computed(() => [{ value: 'annual_effective', title: t('credits.annualEffective') }, { value: 'monthly', title: t('wallets.monthly') }])
const paymentTypeOptions = computed(() => [{ value: 'installment', title: t('credits.installmentPayment') }, { value: 'extra', title: t('credits.extraCapitalPayment') }])
const institutionOptions = computed(() => institutions.value.filter((item) => item.products?.includes('credit')))

const today = () => new Date().toISOString().slice(0, 10)
const nextMonth = () => {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  return date.toISOString().slice(0, 10)
}
const emptyForm = () => ({ name: '', lender: '', institutionCode: '', institutionName: '', institutionLogo: '', type: 'personal', currency: 'COP', principalAmount: 0, capitalBalance: null, interestBalance: 0, annualInterestRate: 0, ratePeriod: 'annual_effective', termMonths: 12, installmentAmount: 0, installmentsPaid: 0, startDate: today(), firstPaymentDate: nextMonth(), nextPaymentDate: nextMonth(), paymentDay: 5, notes: '' })
const form = ref(emptyForm())
const paymentForm = ref({ amount: 0, interestAmount: null, paymentType: 'installment', date: today(), wallet: null, description: '', notes: '' })

const percent = (value) => `${number(value, { maximumFractionDigits: 1 })}%`
const formatDate = (value) => value ? date(value, { day: 'numeric', month: 'short', year: 'numeric' }) : t('credits.noDate')

const onInstitutionChange = (code) => {
  const institution = institutions.value.find((item) => item.code === code)
  if (!institution) return
  form.value.institutionName = institution.code === 'other' ? '' : institution.name
  form.value.institutionLogo = institution.logo || ''
  form.value.lender = form.value.institutionName
}

const openCreate = () => { editing.value = null; form.value = emptyForm(); wizardStep.value = 1; dialog.value = true }
const openEdit = (credit) => {
  editing.value = credit._id
  wizardStep.value = 1
  form.value = {
    ...emptyForm(),
    name: credit.name,
    lender: credit.lender,
    institutionCode: credit.institutionCode || '',
    institutionName: credit.institutionName || credit.lender || '',
    institutionLogo: credit.institutionLogo || '',
    type: credit.type,
    currency: credit.currency,
    principalAmount: credit.principalAmount,
    capitalBalance: credit.capitalBalance ?? credit.outstandingBalance,
    interestBalance: credit.interestBalance || 0,
    annualInterestRate: credit.annualInterestRate,
    ratePeriod: credit.ratePeriod,
    termMonths: credit.termMonths,
    installmentAmount: credit.installmentAmount,
    installmentsPaid: credit.installmentsPaid,
    startDate: credit.startDate ? new Date(credit.startDate).toISOString().slice(0, 10) : today(),
    firstPaymentDate: credit.firstPaymentDate ? new Date(credit.firstPaymentDate).toISOString().slice(0, 10) : today(),
    nextPaymentDate: credit.nextPaymentDate ? new Date(credit.nextPaymentDate).toISOString().slice(0, 10) : today(),
    paymentDay: credit.paymentDay,
    notes: credit.notes || '',
  }
  dialog.value = true
}
const save = async () => {
  saving.value = true
  try {
    if (editing.value) { await store.update(editing.value, form.value); snackbar.success(t('credits.creditUpdated')) }
    else { await store.create(form.value); snackbar.success(t('credits.creditRegistered')) }
    dialog.value = false
  } catch (err) { snackbar.error(err?.response?.data?.message || t('credits.saveCreditError')) }
  saving.value = false
}
const openPayment = (credit) => {
  paymentCredit.value = credit
  paymentForm.value = { amount: credit.installmentAmount || credit.summary?.nextPaymentAmount || 0, interestAmount: null, paymentType: 'installment', date: today(), wallet: null, description: '', notes: '' }
  paymentDialog.value = true
}
const savePayment = async () => {
  if (!paymentCredit.value) return
  paymentSaving.value = true
  try {
    await store.addPayment(paymentCredit.value._id, paymentForm.value)
    snackbar.success(t('credits.paymentRegistered'))
    paymentDialog.value = false
  } catch (err) { snackbar.error(err?.response?.data?.message || t('credits.registerPaymentError')) }
  paymentSaving.value = false
}
const removePayment = async (credit, payment) => {
  if (!window.confirm(t('credits.removePaymentConfirm'))) return
  try { await store.deletePayment(credit._id, payment._id); snackbar.success(t('credits.paymentDeleted')) }
  catch (err) { snackbar.error(err?.response?.data?.message || t('credits.deletePaymentError')) }
}
const confirmDelete = (credit) => { toDelete.value = credit._id; deleteDialog.value = true }
const doDelete = async () => {
  deleting.value = true
  try { await store.remove(toDelete.value); snackbar.success(t('credits.creditDeleted')); deleteDialog.value = false }
  catch (err) { snackbar.error(err?.response?.data?.message || t('credits.deleteCreditError')) }
  deleting.value = false
}

onMounted(async () => {
  store.fetchAll()
  try {
    const [walletsResult, institutionsResult] = await Promise.all([walletsAPI.getAll(), financialInstitutionsAPI.getAll('credit')])
    wallets.value = walletsResult.data
    institutions.value = institutionsResult.data
  } catch {
    wallets.value = []
    institutions.value = []
  }
})
</script>

<style scoped>
.credit-card { height: 100%; }
.credit-card--paid { border: 1px solid rgba(21, 154, 114, 0.35); }
.credit-balance-label { color: var(--finance-muted); font-size: 0.78rem; }
.credit-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.credit-metrics > div { padding: 8px; border-radius: 10px; background: var(--finance-soft); }
.credit-metrics span { display: block; color: var(--finance-muted); font-size: 0.68rem; }
.credit-metrics strong { display: block; margin-top: 3px; color: var(--finance-ink); font-size: 0.84rem; }
.credit-advice { margin: 0; padding-left: 18px; font-size: 0.78rem; }
.plan-scroll { max-height: 460px; overflow: auto; }
@media (max-width: 600px) { .credit-metrics { grid-template-columns: 1fr; } }

.wizard-step-title {
  margin-bottom: 18px;
  color: var(--finance-muted);
  font-size: 0.78rem;
  font-weight: 650;
  text-align: center;
}

.help-icon {
  cursor: help;
}

</style>
