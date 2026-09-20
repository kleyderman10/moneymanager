<template>
  <div>
    <div class="page-intro d-flex align-start align-sm-center flex-column flex-sm-row ga-3">
      <div>
        <div class="page-intro__eyebrow">Patrimonio</div>
        <h1 :class="isMobile ? 'text-h5' : 'text-h4'">Cuentas</h1>
        <p class="page-intro__subtitle">Reúne efectivo, bancos y crédito en una sola vista.</p>
      </div>
      <v-spacer />
      <v-btn v-if="!isMobile && !billingStore.isReadOnly" color="primary" prepend-icon="mdi-plus" @click="openCreate">Nueva cuenta</v-btn>
    </div>


    <v-card v-if="store.wallets.length === 0" class="pa-8 text-center text-grey">
      <v-icon size="x-large" color="grey">mdi-wallet-plus</v-icon>
      <div class="mt-2">No hay cuentas manuales</div>
      <v-btn v-if="!billingStore.isReadOnly" color="primary" variant="text" class="mt-2" @click="openCreate">Crear cuenta manual</v-btn>
    </v-card>

    <v-card v-if="store.wallets.length > 0" class="net-worth-card mb-4">
      <v-card-text class="pa-6">
        <div class="net-worth-card__label">Patrimonio total</div>
        <div class="net-worth-card__amount">${{ fmt(netWorth) }}</div>
        <div class="net-worth-card__bar">
          <div class="net-worth-card__bar-positive" :style="{ width: `${netWorthPositiveShare}%` }" />
          <div class="net-worth-card__bar-negative" :style="{ width: `${100 - netWorthPositiveShare}%` }" />
        </div>
        <v-chip v-if="overdrawnWallets.length" size="small" class="mt-3 net-worth-card__alert" prepend-icon="mdi-alert-circle-outline">
          {{ overdrawnWallets.map((w) => w.name).join(', ') }} en descubierto
        </v-chip>
      </v-card-text>
    </v-card>

    <v-row>
      <v-col v-for="wallet in store.wallets" :key="wallet._id" cols="12" sm="6" md="4">
        <v-card>
          <v-card-title :class="isMobile ? 'text-body-1' : undefined" class="d-flex align-center">
            <v-avatar v-if="wallet.institution?.logo || wallet.institutionLogo" size="32" class="mr-2">
              <img :src="wallet.institution?.logo || wallet.institutionLogo" :alt="wallet.institution?.name || wallet.institutionName || 'Entidad financiera'" />
            </v-avatar>
            <v-icon v-else :color="walletColors[wallet.type]" class="mr-2">{{ walletIcons[wallet.type] }}</v-icon>
            <div class="min-w-0">
              <div class="text-truncate">{{ wallet.name }}</div>
              <div class="text-caption text-medium-emphasis text-truncate">{{ wallet.institution?.name || wallet.institutionName || walletLabels[wallet.accountKind] || walletLabels[wallet.type] }}</div>
            </div>
          </v-card-title>
          <v-card-text>
            <template v-if="wallet.type === 'credit'">
              <div class="text-caption text-medium-emphasis">Disponible</div>
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
                Usado {{ walletMoney(wallet.creditSummary.usedCredit, wallet.currency) }} de {{ walletMoney(wallet.creditSummary.creditLimit, wallet.currency) }} ({{ percent(wallet.creditSummary.utilizationRate) }})
              </div>
              <div class="credit-metrics mt-3">
                <div><span>Pago mínimo estimado</span><strong>{{ walletMoney(wallet.creditSummary?.minimumPayment, wallet.currency) }}</strong></div>
                <div><span>Interés mensual estimado</span><strong>{{ walletMoney(wallet.creditSummary?.estimatedInterest, wallet.currency) }}</strong></div>
                <div><span>Cuota de manejo ({{ wallet.managementFeePeriod === 'annual' ? 'anual' : 'mensual' }})</span><strong>{{ walletMoney(wallet.creditSummary?.managementFee, wallet.currency) }}</strong></div>
                <div><span>Compras del ciclo</span><strong>{{ walletMoney(wallet.creditSummary?.cyclePurchases, wallet.currency) }}</strong></div>
                <div><span>Abonos del ciclo</span><strong>{{ walletMoney(wallet.creditSummary?.cyclePayments, wallet.currency) }}</strong></div>
              </div>
              <div v-if="wallet.creditSummary" class="credit-dates mt-3">
                <div><v-icon size="16">mdi-calendar-refresh</v-icon> Corte: <strong>{{ formatDate(wallet.creditSummary.nextCutOffDate) }}</strong></div>
                <div><v-icon size="16">mdi-calendar-check</v-icon> Pago: <strong>{{ formatDate(wallet.creditSummary.nextPaymentDate) }}</strong></div>
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
                <v-chip v-if="wallet.balance < 0" size="small" color="error" variant="tonal" prepend-icon="mdi-alert-circle-outline">en descubierto</v-chip>
              </div>
            </template>
          </v-card-text>
          <v-card-actions>
            <v-btn v-if="!billingStore.isReadOnly" size="small" variant="text" prepend-icon="mdi-swap-horizontal" @click="openTransfer(wallet)">Transferir</v-btn>
            <v-spacer />
            <v-btn v-if="!billingStore.isReadOnly" size="small" variant="text" icon="mdi-pencil" @click="openEdit(wallet)" />
            <v-btn v-if="!billingStore.isReadOnly" size="small" variant="text" icon="mdi-delete" color="error" @click="confirmDelete(wallet)" />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" :fullscreen="isMobile" max-width="440">
      <v-card :title="editing ? 'Editar cuenta' : 'Nueva cuenta'" class="capture-form">
        <v-card-text>
          <v-text-field v-model="form.name" label="Nombre" variant="outlined" density="compact" required class="mb-3" />

          <label class="form-label">Tipo de cuenta</label>
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
          <NativeSelectField v-if="accountKindOptions.length > 1" v-model="form.accountKind" :items="accountKindOptions" label="Producto" required class="mb-2" />

          <NativeSelectField v-model="form.institutionCode" :items="institutionOptions" item-title="name" item-value="code" label="Entidad financiera" placeholder="Selecciona una entidad" @update:model-value="onInstitutionChange" />
          <v-text-field v-if="form.institutionCode === 'other'" v-model="form.institutionName" label="Nombre de la entidad" variant="outlined" density="compact" hint="Puedes registrar una entidad no incluida en el catálogo." persistent-hint class="mb-3" />

          <BankConnector
            v-if="['bank', 'credit'].includes(form.type) && !form.belvoLinkId"
            class="mt-2"
            @success="onBelvoLinked"
          />
          <v-alert v-else-if="form.belvoLinkId" type="success" variant="tonal" density="compact" class="mb-4">
            Cuenta vinculada con Belvo exitosamente.
          </v-alert>

          <div class="d-flex align-end ga-4 mb-1">
            <MoneyField
              class="flex-grow-1"
              :model-value="form.balance"
              @update:model-value="(v) => (form.balance = v)"
              :label="form.type === 'credit' ? 'Saldo utilizado actual' : 'Balance'"
              size="hero"
              required
            />
            <div class="currency-toggle">
              <button type="button" class="currency-toggle__option" :class="{ 'currency-toggle__option--active': form.currency === 'COP' }" @click="form.currency = 'COP'">COP</button>
              <button type="button" class="currency-toggle__option" :class="{ 'currency-toggle__option--active': form.currency === 'USD' }" @click="form.currency = 'USD'">USD</button>
            </div>
          </div>
          <v-text-field
            v-if="!['COP', 'USD'].includes(form.currency)"
            v-model="form.currency"
            label="Otra moneda"
            variant="outlined"
            density="compact"
            maxlength="3"
            hint="Esta cuenta usa una moneda distinta a COP/USD; puedes ajustarla aquí."
            persistent-hint
            style="max-width: 220px"
            class="mb-3"
          />
          <div v-if="form.type === 'credit'" class="form-hint mb-3">Se mostrará como deuda de la tarjeta y reducirá el cupo disponible.</div>

          <template v-if="form.type === 'credit'">
            <v-divider class="my-4" />
            <div class="text-subtitle-2 mb-2">Configuración de la tarjeta</div>
            <MoneyField v-model="form.creditLimit" label="Cupo aprobado" hint="El cupo total que aprobó el banco." />
            <v-text-field v-model.number="form.annualInterestRate" label="Interés efectivo anual" type="number" min="0" max="200" step="0.01" variant="outlined" density="compact" suffix="% E.A." class="mb-3" />
            <MoneyField v-model="form.managementFee" label="Cuota de manejo" />
            <NativeSelectField v-model="form.managementFeePeriod" :items="feePeriods" label="Periodicidad de cuota de manejo" class="mb-2" />
            <v-text-field v-model.number="form.minimumPaymentRate" label="Porcentaje de pago mínimo" type="number" min="1" max="100" variant="outlined" density="compact" suffix="%" hint="Se usa para estimar la cuota mínima." persistent-hint class="mb-3" />
            <v-row dense>
              <v-col cols="6"><v-text-field v-model.number="form.cutOffDay" label="Día de corte" type="number" min="1" max="28" variant="outlined" density="compact" suffix="de cada mes" /></v-col>
              <v-col cols="6"><v-text-field v-model.number="form.paymentDueDay" label="Día límite de pago" type="number" min="1" max="28" variant="outlined" density="compact" suffix="de cada mes" /></v-col>
            </v-row>
          </template>
        </v-card-text>
        <v-card-actions class="form-actions">
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-spacer />
          <v-btn class="form-actions__primary" @click="save">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="transferDialog" :fullscreen="isMobile" max-width="400">
      <v-card title="Transferir">
        <v-card-text>
          <NativeSelectField v-model="transferForm.toWalletId" :items="transferTargets" item-title="name" item-value="_id" label="Cuenta destino" placeholder="Selecciona una cuenta" :error="transferAttempted && !transferForm.toWalletId" required />
          <v-text-field v-model.number="transferForm.amount" label="Monto" type="number" density="compact" required />
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="transferDialog = false">Cancelar</v-btn><v-btn color="primary" @click="doTransfer" :loading="transferring">Transferir</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card><v-card-title>Confirmar</v-card-title><v-card-text>¿Eliminar esta cuenta?</v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn><v-btn color="error" @click="doDelete">Eliminar</v-btn></v-card-actions></v-card>
    </v-dialog>

    <v-btn v-if="isMobile && !billingStore.isReadOnly" icon="mdi-plus" color="primary" size="x-large" class="finance-fab" @click="openCreate" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useWalletsStore } from '@/stores/wallets'
import { useSnackbar } from '@/stores/snackbar'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { useAuthStore } from '@/stores/auth'
import { financialInstitutionsAPI } from '@/api'
import NativeSelectField from '@/components/NativeSelectField.vue'
import BankConnector from '@/components/BankConnector.vue'
import MoneyField from '@/components/MoneyField.vue'

const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const store = useWalletsStore()
const snackbar = useSnackbar()
const billingStore = useSubscriptionStore()
const authStore = useAuthStore()

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
const walletLabels = { cash: 'Efectivo', bank: 'Banco', credit: 'Crédito', checking: 'Cuenta corriente', savings: 'Cuenta de ahorros', credit_card: 'Tarjeta de crédito', digital_wallet: 'Billetera virtual', low_amount: 'Depósito de bajo monto' }
const typeCardOptions = [
  { value: 'cash', label: 'Efectivo', icon: 'mdi-cash' },
  { value: 'bank', label: 'Bancaria', icon: 'mdi-bank' },
  { value: 'credit', label: 'Crédito', icon: 'mdi-credit-card' },
]
const feePeriods = [{ title: 'Mensual', value: 'monthly' }, { title: 'Anual', value: 'annual' }]
const kindOptions = {
  cash: [{ title: 'Efectivo', value: 'cash' }],
  bank: [{ title: 'Cuenta de ahorros', value: 'savings' }, { title: 'Cuenta corriente', value: 'checking' }, { title: 'Billetera virtual', value: 'digital_wallet' }, { title: 'Depósito de bajo monto', value: 'low_amount' }],
  credit: [{ title: 'Tarjeta de crédito', value: 'credit_card' }],
}
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
const accountKindOptions = computed(() => kindOptions[form.value.type] || kindOptions.cash)
const institutionProduct = computed(() => {
  if (form.value.type === 'credit') return 'credit_card'
  if (['digital_wallet', 'low_amount'].includes(form.value.accountKind)) return 'digital_wallet'
  return 'accounts'
})
const institutionOptions = computed(() => institutions.value.filter((item) => item.products?.includes(institutionProduct.value)))
const fmt = (n) => Number(n || 0).toLocaleString('es-CO')
const walletMoney = (value, currency = 'COP') => {
  if (value === null || value === undefined) return 'Sin cupo'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency || 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}
const percent = (value) => `${Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`
const formatDate = (value) => value
  ? new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
  : 'Sin configurar'

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
    if (editing.value) { await store.update(editing.value, form.value); snackbar.success('Cuenta actualizada') }
    else { await store.create(form.value); snackbar.success('Cuenta creada') }
    dialog.value = false
  } catch (err) { snackbar.error(err?.response?.data?.message || 'Error al guardar la cuenta') }
}
const openTransfer = (w) => { fromWallet.value = w._id; transferAttempted.value = false; transferForm.value = { fromWalletId: w._id, toWalletId: '', amount: 0 }; transferDialog.value = true }
const doTransfer = async () => {
  transferAttempted.value = true
  if (!transferForm.value.toWalletId) { snackbar.error('Selecciona una cuenta destino'); return }
  transferring.value = true
  try { await store.transfer(transferForm.value); snackbar.success('Transferencia exitosa'); transferDialog.value = false } catch (err) { snackbar.error(err?.response?.data?.message || 'Error al transferir') }
  transferring.value = false
}
const confirmDelete = (w) => { toDelete.value = w._id; deleteDialog.value = true }
const doDelete = async () => { try { await store.remove(toDelete.value); snackbar.success('Cuenta eliminada') } catch { snackbar.error('Error') }; deleteDialog.value = false }

watch(() => form.value.type, (type) => {
  const options = kindOptions[type] || kindOptions.cash
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

.currency-toggle {
  display: flex;
  flex: 0 0 auto;
  padding: 3px;
  border-radius: 10px;
  background: #F4F7F7;
  margin-bottom: 10px;
}

.currency-toggle__option {
  padding: 8px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--finance-muted);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.currency-toggle__option--active {
  background: #fff;
  color: var(--finance-ink);
  box-shadow: 0 1px 3px rgba(12, 38, 48, 0.16);
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
