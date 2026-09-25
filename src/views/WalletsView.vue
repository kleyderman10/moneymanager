<template>
  <div>
    <div data-tour="page-intro" class="page-intro d-flex align-start align-sm-center flex-column flex-sm-row ga-3">
      <div>
        <div class="page-intro__eyebrow">{{ t('wallets.equity') }}</div>
        <h1 :class="isMobile ? 'text-h5' : 'text-h4'">{{ t('nav.wallets') }}</h1>
        <p class="page-intro__subtitle">{{ t('wallets.subtitle') }}</p>
      </div>
      <v-spacer />
      <v-btn v-if="!isMobile && !billingStore.isReadOnly" data-tour="page-add" color="primary" prepend-icon="mdi-plus" @click="openCreate">{{ t('wallets.newAccount') }}</v-btn>
    </div>


    <v-card v-if="store.wallets.length === 0" class="pa-8 text-center text-grey">
      <v-icon size="x-large" color="grey">mdi-wallet-plus</v-icon>
      <div class="mt-2">{{ t('wallets.noManualAccounts') }}</div>
      <v-btn v-if="!billingStore.isReadOnly" color="primary" variant="text" class="mt-2" @click="openCreate">{{ t('wallets.createManualAccount') }}</v-btn>
    </v-card>

    <v-card v-if="store.wallets.length > 0" class="net-worth-card mb-4" data-tour="wallets-networth">
      <v-card-text class="pa-6">
        <div class="net-worth-card__label">{{ t('wallets.totalEquity') }}</div>
        <div class="net-worth-card__amount">{{ money(netWorth) }}</div>
        <div class="net-worth-card__bar">
          <div class="net-worth-card__bar-positive" :style="{ width: `${netWorthPositiveShare}%` }" />
          <div class="net-worth-card__bar-negative" :style="{ width: `${100 - netWorthPositiveShare}%` }" />
        </div>
        <v-chip v-if="overdrawnWallets.length" size="small" class="mt-3 net-worth-card__alert" prepend-icon="mdi-alert-circle-outline">
          {{ t('wallets.overdrawn', { names: overdrawnWallets.map((w) => w.name).join(', ') }) }}
        </v-chip>
      </v-card-text>
    </v-card>

    <v-row>
      <v-col v-for="wallet in store.wallets" :key="wallet._id" cols="12" sm="6" md="4">
        <v-card>
          <v-card-title :class="isMobile ? 'text-body-1' : undefined" class="d-flex align-center">
            <v-avatar v-if="wallet.institution?.logo || wallet.institutionLogo" size="32" class="mr-2">
              <img :src="wallet.institution?.logo || wallet.institutionLogo" :alt="wallet.institution?.name || wallet.institutionName || t('wallets.financialInstitution')" />
            </v-avatar>
            <v-icon v-else :color="walletColors[wallet.type]" class="mr-2">{{ walletIcons[wallet.type] }}</v-icon>
            <div class="min-w-0">
              <div class="text-truncate">{{ wallet.name }}</div>
              <div class="text-caption text-medium-emphasis text-truncate">{{ wallet.institution?.name || wallet.institutionName || walletLabels[wallet.accountKind] || walletLabels[wallet.type] }}</div>
            </div>
          </v-card-title>
          <v-card-text>
            <template v-if="wallet.type === 'credit'">
              <div class="text-caption text-medium-emphasis">{{ t('wallets.available') }}</div>
              <div :class="isMobile ? 'text-h5' : 'text-h4'">{{ walletMoney(wallet.creditSummary?.availableCredit, wallet.currency) }}</div>
              <v-progress-linear
                v-if="wallet.creditSummary?.creditLimit"
                class="mt-3"
                color="primary"
                rounded
                height="8"
                :model-value="Math.min(100, wallet.creditSummary.utilizationRate || 0)"
              />
              <div v-if="wallet.creditSummary?.creditLimit" class="text-caption text-medium-emphasis mt-1">
                {{ t('wallets.usedOf', { used: walletMoney(wallet.creditSummary.usedCredit, wallet.currency), limit: walletMoney(wallet.creditSummary.creditLimit, wallet.currency), percent: percent(wallet.creditSummary.utilizationRate) }) }}
              </div>
              <div class="credit-metrics mt-3">
                <div><span>{{ t('wallets.estMinPayment') }}</span><strong>{{ walletMoney(wallet.creditSummary?.minimumPayment, wallet.currency) }}</strong></div>
                <div><span>{{ t('wallets.estMonthlyInterest') }}</span><strong>{{ walletMoney(wallet.creditSummary?.estimatedInterest, wallet.currency) }}</strong></div>
                <div><span>{{ t('wallets.managementFee') }} ({{ wallet.managementFeePeriod === 'annual' ? t('wallets.annual') : t('wallets.monthly') }})</span><strong>{{ walletMoney(wallet.creditSummary?.managementFee, wallet.currency) }}</strong></div>
                <div><span>{{ t('wallets.cyclePurchases') }}</span><strong>{{ walletMoney(wallet.creditSummary?.cyclePurchases, wallet.currency) }}</strong></div>
                <div><span>{{ t('wallets.cyclePayments') }}</span><strong>{{ walletMoney(wallet.creditSummary?.cyclePayments, wallet.currency) }}</strong></div>
              </div>
              <div v-if="wallet.creditSummary" class="credit-dates mt-3">
                <div><v-icon size="16">mdi-calendar-refresh</v-icon> {{ t('wallets.cutOff') }}: <strong>{{ formatDate(wallet.creditSummary.nextCutOffDate) }}</strong></div>
                <div><v-icon size="16">mdi-calendar-check</v-icon> {{ t('wallets.payment') }}: <strong>{{ formatDate(wallet.creditSummary.nextPaymentDate) }}</strong></div>
              </div>
              <v-alert v-if="wallet.creditSummary?.advice?.length" class="mt-3" type="info" variant="tonal" density="compact">
                <ul class="credit-advice">
                  <li v-for="tip in wallet.creditSummary.advice.slice(0, 2)" :key="tip">{{ tip }}</li>
                </ul>
              </v-alert>
            </template>
            <template v-else>
              <div :class="[isMobile ? 'text-h5' : 'text-h4', wallet.balance < 0 ? 'text-error' : null]">{{ walletMoney(wallet.balance, wallet.currency) }}</div>
              <div class="d-flex flex-wrap ga-1 mt-1">
                <v-chip size="small">{{ walletLabels[wallet.accountKind] || walletLabels[wallet.type] }}</v-chip>
                <v-chip v-if="wallet.balance < 0" size="small" color="error" variant="tonal" prepend-icon="mdi-alert-circle-outline">{{ t('wallets.overdrawnSingle') }}</v-chip>
              </div>
            </template>
          </v-card-text>
          <v-card-actions>
            <v-btn v-if="!billingStore.isReadOnly" size="small" variant="text" prepend-icon="mdi-swap-horizontal" data-tour="wallets-transfer" @click="openTransfer(wallet)">{{ t('wallets.transfer') }}</v-btn>
            <v-spacer />
            <v-btn v-if="!billingStore.isReadOnly" size="small" variant="text" icon="mdi-pencil" @click="openEdit(wallet)" />
            <v-btn v-if="!billingStore.isReadOnly" size="small" variant="text" icon="mdi-delete" color="error" @click="confirmDelete(wallet)" />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" :fullscreen="isMobile" max-width="440">
      <v-card :title="editing ? t('wallets.editAccount') : t('wallets.newAccount')" class="capture-form">
        <v-card-text>
          <v-text-field v-model="form.name" :label="t('profile.name')" variant="outlined" density="compact" required class="mb-3" />

          <label class="form-label">{{ t('wallets.accountType') }}</label>
          <div class="type-card-picker mb-2">
            <button
              v-for="opt in typeCardOptions"
              :key="opt.value"
              type="button"
              class="type-card"
              :class="{ 'type-card--active': form.type === opt.value }"
              @click="form.type = opt.value"
            >
              <v-icon size="24">{{ opt.icon }}</v-icon>
              <span class="type-card__label">{{ opt.label }}</span>
            </button>
          </div>
          <NativeSelectField v-if="accountKindOptions.length > 1" v-model="form.accountKind" :items="accountKindOptions" :label="t('wallets.product')" required class="mb-2" />

          <NativeSelectField v-model="form.institutionCode" :items="institutionOptions" item-title="name" item-value="code" :label="t('wallets.financialInstitution')" :placeholder="t('wallets.selectInstitution')" @update:model-value="onInstitutionChange" />
          <v-text-field v-if="form.institutionCode === 'other'" v-model="form.institutionName" :label="t('wallets.institutionName')" variant="outlined" density="compact" :hint="t('wallets.institutionNameHint')" persistent-hint class="mb-3" />

          <BankConnector
            v-if="['bank', 'credit'].includes(form.type) && !form.belvoLinkId"
            class="mt-2"
            @success="onBelvoLinked"
          />
          <v-alert v-else-if="form.belvoLinkId" type="success" variant="tonal" density="compact" class="mb-4">
            {{ t('wallets.belvoLinked') }}
          </v-alert>

          <!-- Full-width row, chosen before the balance: the balance's symbol depends on it,
               and a narrow select next to the hero amount truncated "COP · Peso colombiano". -->
          <NativeSelectField v-model="form.currency" :items="currencyOptions" item-title="label" item-value="code" :label="t('wallets.currency')" />
          <MoneyField
            class="mb-1"
            :model-value="form.balance"
            :currency="form.currency"
            @update:model-value="(v) => (form.balance = v)"
            :label="form.type === 'credit' ? t('wallets.currentUsedBalance') : t('wallets.balance')"
            size="hero"
            required
          />
          <div v-if="form.type === 'credit'" class="form-hint mb-3">{{ t('wallets.creditFormHint') }}</div>

          <template v-if="form.type === 'credit'">
            <v-divider class="my-4" />
            <div class="text-subtitle-2 mb-2">{{ t('wallets.cardSettings') }}</div>
            <MoneyField v-model="form.creditLimit" :currency="form.currency" :label="t('wallets.approvedLimit')" :hint="t('wallets.approvedLimitHint')" />
            <v-text-field v-model.number="form.annualInterestRate" :label="t('wallets.annualEffectiveRate')" type="number" min="0" max="200" step="0.01" variant="outlined" density="compact" suffix="% E.A." class="mb-3" />
            <MoneyField v-model="form.managementFee" :currency="form.currency" :label="t('wallets.managementFee')" />
            <NativeSelectField v-model="form.managementFeePeriod" :items="feePeriods" :label="t('wallets.managementFeePeriod')" class="mb-2" />
            <v-text-field v-model.number="form.minimumPaymentRate" :label="t('wallets.minimumPaymentPercent')" type="number" min="1" max="100" variant="outlined" density="compact" suffix="%" :hint="t('wallets.minimumPaymentHint')" persistent-hint class="mb-3" />
            <v-row dense>
              <v-col cols="6"><v-text-field v-model.number="form.cutOffDay" :label="t('wallets.cutOffDay')" type="number" min="1" max="28" variant="outlined" density="compact" :suffix="t('wallets.ofEachMonth')" /></v-col>
              <v-col cols="6"><v-text-field v-model.number="form.paymentDueDay" :label="t('wallets.paymentDueDay')" type="number" min="1" max="28" variant="outlined" density="compact" :suffix="t('wallets.ofEachMonth')" /></v-col>
            </v-row>
          </template>
        </v-card-text>
        <v-card-actions class="form-actions">
          <v-btn variant="text" @click="dialog = false">{{ t('common.cancel') }}</v-btn>
          <v-spacer />
          <v-btn class="form-actions__primary" @click="save">{{ t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="transferDialog" :fullscreen="isMobile" max-width="400">
      <v-card :title="t('wallets.transfer')">
        <v-card-text>
          <NativeSelectField v-model="transferForm.toWalletId" :items="transferTargets" item-title="name" item-value="_id" :label="t('wallets.destinationAccount')" :placeholder="t('wallets.selectAccount')" :error="transferAttempted && !transferForm.toWalletId" required />
          <v-text-field v-model.number="transferForm.amount" :label="t('wallets.amount')" type="number" density="compact" required />
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="transferDialog = false">{{ t('common.cancel') }}</v-btn><v-btn color="primary" @click="doTransfer" :loading="transferring">{{ t('wallets.transfer') }}</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card><v-card-title>{{ t('wallets.confirm') }}</v-card-title><v-card-text>{{ t('wallets.deleteAccountConfirm') }}</v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="deleteDialog = false">{{ t('common.cancel') }}</v-btn><v-btn color="error" @click="doDelete">{{ t('common.delete') }}</v-btn></v-card-actions></v-card>
    </v-dialog>

    <v-btn v-if="isMobile && !billingStore.isReadOnly" icon="mdi-plus" color="primary" size="x-large" class="finance-fab" data-tour="page-add" @click="openCreate" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { useWalletsStore } from '@/stores/wallets'
import { useSnackbar } from '@/stores/snackbar'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { useAuthStore } from '@/stores/auth'
import { useLocale } from '@/composables/useLocale'
import { CURRENCIES } from '@/constants/countries'
import { financialInstitutionsAPI } from '@/api'
import NativeSelectField from '@/components/NativeSelectField.vue'
import BankConnector from '@/components/BankConnector.vue'
import MoneyField from '@/components/MoneyField.vue'

const { t, locale: appLocale } = useI18n()
const { money, number, date } = useLocale()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const store = useWalletsStore()
const snackbar = useSnackbar()
const billingStore = useSubscriptionStore()
const authStore = useAuthStore()
const currencyOptions = computed(() => CURRENCIES.map((c) => ({
  code: c.code,
  label: `${c.code} · ${appLocale.value === 'en' ? c.nameEn : c.nameEs}`,
})))

// Non-credit wallets only: a card's balance is debt, not part of net worth.
const cashWallets = computed(() => store.wallets.filter((w) => w.type !== 'credit'))
const netWorth = computed(() => cashWallets.value.reduce((sum, w) => sum + (Number(w.balance) || 0), 0))
const overdrawnWallets = computed(() => cashWallets.value.filter((w) => Number(w.balance) < 0))
const netWorthPositiveShare = computed(() => {
  const positive = cashWallets.value.filter((w) => Number(w.balance) >= 0).reduce((s, w) => s + Number(w.balance), 0)
  const negative = overdrawnWallets.value.reduce((s, w) => s + Math.abs(Number(w.balance)), 0)
  const total = positive + negative
  return total ? Math.round((positive / total) * 100) : 100
})
const dialog = ref(false)
const transferDialog = ref(false)
const deleteDialog = ref(false)
const editing = ref(null)
const toDelete = ref(null)
const fromWallet = ref(null)
const transferring = ref(false)
const transferAttempted = ref(false)

const walletIcons = { cash: 'mdi-cash', bank: 'mdi-bank', credit: 'mdi-credit-card' }
const walletColors = { cash: 'green', bank: 'blue', credit: 'purple' }
const walletLabels = computed(() => ({
  cash: t('wallets.cash'),
  bank: t('wallets.bank'),
  credit: t('wallets.credit'),
  checking: t('wallets.checking'),
  savings: t('wallets.savings'),
  credit_card: t('dashboard.creditCard'),
  digital_wallet: t('wallets.digitalWallet'),
  low_amount: t('wallets.lowAmountDeposit'),
}))
const typeCardOptions = computed(() => [
  { value: 'cash', label: t('wallets.cash'), icon: 'mdi-cash' },
  { value: 'bank', label: t('wallets.bankType'), icon: 'mdi-bank' },
  { value: 'credit', label: t('wallets.credit'), icon: 'mdi-credit-card' },
])
const feePeriods = computed(() => [{ title: t('wallets.monthly'), value: 'monthly' }, { title: t('wallets.annual'), value: 'annual' }])
const kindOptions = computed(() => ({
  cash: [{ title: t('wallets.cash'), value: 'cash' }],
  bank: [
    { title: t('wallets.savings'), value: 'savings' },
    { title: t('wallets.checking'), value: 'checking' },
    { title: t('wallets.digitalWallet'), value: 'digital_wallet' },
    { title: t('wallets.lowAmountDeposit'), value: 'low_amount' },
  ],
  credit: [{ title: t('dashboard.creditCard'), value: 'credit_card' }],
}))
const institutions = ref([])
const emptyForm = () => ({
  name: '',
  type: 'cash',
  accountKind: 'cash',
  institutionCode: '',
  institutionName: '',
  institutionLogo: '',
  balance: 0,
  currency: authStore.user?.currency || 'COP',
  creditLimit: 0,
  annualInterestRate: 0,
  managementFee: 0,
  managementFeePeriod: 'monthly',
  minimumPaymentRate: 5,
  cutOffDay: 15,
  paymentDueDay: 5,
  belvoLinkId: null,
  belvoInstitution: null,
})
const form = ref(emptyForm())
const transferForm = ref({ fromWalletId: '', toWalletId: '', amount: 0 })
const transferTargets = computed(() => store.wallets.filter(w => w._id !== fromWallet.value))
const accountKindOptions = computed(() => kindOptions.value[form.value.type] || kindOptions.value.cash)
const institutionProduct = computed(() => {
  if (form.value.type === 'credit') return 'credit_card'
  if (['digital_wallet', 'low_amount'].includes(form.value.accountKind)) return 'digital_wallet'
  return 'accounts'
})
const institutionOptions = computed(() => institutions.value.filter((item) => item.products?.includes(institutionProduct.value)))
const walletMoney = (value, currency) => {
  if (value === null || value === undefined) return t('wallets.noLimit')
  return money(value, currency)
}
const percent = (value) => `${number(value, { maximumFractionDigits: 1 })}%`
const formatDate = (value) => value ? date(value, { day: 'numeric', month: 'short', year: 'numeric' }) : t('wallets.notSet')

const onInstitutionChange = (code) => {
  const institution = institutions.value.find((item) => item.code === code)
  if (!institution) return
  form.value.institutionName = institution.code === 'other' ? '' : institution.name
  form.value.institutionLogo = institution.logo || ''
}

const onBelvoLinked = ({ linkId, institution }) => {
  form.value.belvoLinkId = linkId
  form.value.belvoInstitution = institution
  // Try to match institution name with our catalog
  const matchingInst = institutions.value.find(inst => 
    inst.name.toLowerCase().includes(institution.toLowerCase()) ||
    institution.toLowerCase().includes(inst.name.toLowerCase())
  )
  if (matchingInst) {
    form.value.institutionCode = matchingInst.code
    onInstitutionChange(matchingInst.code)
  } else {
    form.value.institutionCode = 'other'
    form.value.institutionName = institution
  }
}

const openCreate = () => { editing.value = null; form.value = emptyForm(); dialog.value = true }
const openEdit = (w) => {
  editing.value = w._id
  form.value = {
    ...emptyForm(),
    name: w.name,
    type: w.type,
    accountKind: w.accountKind || (w.type === 'credit' ? 'credit_card' : w.type === 'bank' ? 'savings' : 'cash'),
    institutionCode: w.institutionCode || w.institution?.code || '',
    institutionName: w.institutionName || w.institution?.name || '',
    institutionLogo: w.institutionLogo || w.institution?.logo || '',
    balance: w.type === 'credit' ? Math.max(0, -(Number(w.balance) || 0)) : w.balance,
    currency: w.currency,
    creditLimit: w.creditLimit || w.creditSummary?.creditLimit || 0,
    annualInterestRate: w.annualInterestRate || w.creditSummary?.annualInterestRate || 0,
    managementFee: w.managementFee || w.creditSummary?.managementFee || 0,
    managementFeePeriod: w.managementFeePeriod || 'monthly',
    minimumPaymentRate: w.minimumPaymentRate || w.creditSummary?.minimumPaymentRate || 5,
    cutOffDay: w.cutOffDay || w.creditSummary?.cutOffDay || 15,
    paymentDueDay: w.paymentDueDay || w.creditSummary?.paymentDueDay || 5,
    belvoLinkId: w.belvoLinkId || null,
    belvoInstitution: w.belvoInstitution || null,
  }
  dialog.value = true
}
const save = async () => {
  try {
    if (editing.value) { await store.update(editing.value, form.value); snackbar.success(t('wallets.accountUpdated')) }
    else { await store.create(form.value); snackbar.success(t('wallets.accountCreated')) }
    dialog.value = false
  } catch (err) { snackbar.error(err?.response?.data?.message || t('wallets.saveError')) }
}
const openTransfer = (w) => { fromWallet.value = w._id; transferAttempted.value = false; transferForm.value = { fromWalletId: w._id, toWalletId: '', amount: 0 }; transferDialog.value = true }
const doTransfer = async () => {
  transferAttempted.value = true
  if (!transferForm.value.toWalletId) { snackbar.error(t('wallets.selectDestinationAccount')); return }
  transferring.value = true
  try { await store.transfer(transferForm.value); snackbar.success(t('wallets.transferSuccess')); transferDialog.value = false } catch (err) { snackbar.error(err?.response?.data?.message || t('wallets.transferError')) }
  transferring.value = false
}
const confirmDelete = (w) => { toDelete.value = w._id; deleteDialog.value = true }
const doDelete = async () => { try { await store.remove(toDelete.value); snackbar.success(t('wallets.accountDeleted')) } catch { snackbar.error(t('common.error')) }; deleteDialog.value = false }

watch(() => form.value.type, (type) => {
  const options = kindOptions.value[type] || kindOptions.value.cash
  if (!options.some((item) => item.value === form.value.accountKind)) form.value.accountKind = options[0].value
  if (form.value.institutionCode) onInstitutionChange(form.value.institutionCode)
})

onMounted(async () => {
  store.fetchAll()
  try { institutions.value = (await financialInstitutionsAPI.getAll()).data } catch { institutions.value = [] }
})
</script>

<style scoped>
.net-worth-card {
  border: 0 !important;
  background: #0C2630 !important;
  color: #fff;
}

.net-worth-card__label {
  color: #a8c8c4;
  font-size: 0.78rem;
  font-weight: 650;
}

.net-worth-card__amount {
  margin: 7px 0 16px;
  font-size: clamp(1.8rem, 3.6vw, 2.6rem);
  font-weight: 780;
  letter-spacing: -0.03em;
}

.net-worth-card__bar {
  display: flex;
  overflow: hidden;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}

.net-worth-card__bar-positive {
  background: #4FB587;
}

.net-worth-card__bar-negative {
  background: #D9634F;
}

.net-worth-card__alert {
  color: #ffd9d0 !important;
  background: rgba(217, 99, 79, 0.22) !important;
}

.form-hint {
  color: var(--finance-muted);
  font-size: 0.74rem;
}

.credit-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.credit-metrics > div {
  padding: 8px;
  border-radius: 10px;
  background: var(--finance-soft);
}

.credit-metrics span {
  display: block;
  color: var(--finance-muted);
  font-size: 0.68rem;
}

.credit-metrics strong {
  display: block;
  margin-top: 3px;
  color: var(--finance-ink);
  font-size: 0.85rem;
}

.credit-dates {
  display: grid;
  gap: 5px;
  color: var(--finance-muted);
  font-size: 0.78rem;
}

.credit-dates strong {
  color: var(--finance-ink);
}

.credit-advice {
  margin: 0;
  padding-left: 18px;
  font-size: 0.78rem;
}

@media (max-width: 600px) {
  .credit-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
