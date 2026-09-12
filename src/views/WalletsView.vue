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


    <v-row v-else>
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
              <div :class="isMobile ? 'text-h5' : 'text-h4'">{{ walletMoney(wallet.balance, wallet.currency) }}</div>
              <v-chip size="small" class="mt-1">{{ walletLabels[wallet.accountKind] || walletLabels[wallet.type] }}</v-chip>
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

    <v-dialog v-model="dialog" :fullscreen="isMobile" max-width="400">
      <v-card :title="editing ? 'Editar' : 'Nueva cuenta'">
        <v-card-text>
          <v-text-field v-model="form.name" label="Nombre" density="compact" required />
          <NativeSelectField v-model="form.type" :items="typeOptions" label="Tipo" required />
          <NativeSelectField v-model="form.accountKind" :items="accountKindOptions" label="Producto" required />
          <NativeSelectField v-model="form.institutionCode" :items="institutionOptions" item-title="name" item-value="code" label="Entidad financiera" placeholder="Selecciona una entidad" @update:model-value="onInstitutionChange" />
          <v-text-field v-if="form.institutionCode === 'other'" v-model="form.institutionName" label="Nombre de la entidad" density="compact" hint="Puedes registrar una entidad no incluida en el catálogo." persistent-hint />
          
          <BankConnector 
            v-if="['bank', 'credit'].includes(form.type) && !form.belvoLinkId"
            class="mt-2"
            @success="onBelvoLinked"
          />
          <v-alert v-else-if="form.belvoLinkId" type="success" variant="tonal" density="compact" class="mb-4">
            Cuenta vinculada con Belvo exitosamente.
          </v-alert>

          <v-text-field v-model.number="form.balance" :label="form.type === 'credit' ? 'Saldo utilizado actual' : 'Balance'" type="number" density="compact" required :hint="form.type === 'credit' ? 'Se mostrará como deuda de la tarjeta y reducirá el cupo disponible.' : undefined" :persistent-hint="form.type === 'credit'" />
          <v-text-field v-model="form.currency" label="Moneda" density="compact" />
          <template v-if="form.type === 'credit'">
            <v-divider class="my-4" />
            <div class="text-subtitle-2 mb-2">Configuración de la tarjeta</div>
            <v-text-field v-model.number="form.creditLimit" label="Cupo aprobado" type="number" min="0" density="compact" prefix="$" hint="El cupo total que aprobó el banco." persistent-hint />
            <v-text-field v-model.number="form.annualInterestRate" label="Interés efectivo anual" type="number" min="0" max="200" step="0.01" density="compact" suffix="% E.A." />
            <v-text-field v-model.number="form.managementFee" label="Cuota de manejo" type="number" min="0" density="compact" prefix="$" />
            <NativeSelectField v-model="form.managementFeePeriod" :items="feePeriods" label="Periodicidad de cuota de manejo" />
            <v-text-field v-model.number="form.minimumPaymentRate" label="Porcentaje de pago mínimo" type="number" min="1" max="100" density="compact" suffix="%" hint="Se usa para estimar la cuota mínima." persistent-hint />
            <v-row dense>
              <v-col cols="6"><v-text-field v-model.number="form.cutOffDay" label="Día de corte" type="number" min="1" max="28" density="compact" suffix="de cada mes" /></v-col>
              <v-col cols="6"><v-text-field v-model.number="form.paymentDueDay" label="Día límite de pago" type="number" min="1" max="28" density="compact" suffix="de cada mes" /></v-col>
            </v-row>
          </template>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="dialog = false">Cancelar</v-btn><v-btn color="primary" @click="save">Guardar</v-btn></v-card-actions>
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
import { financialInstitutionsAPI } from '@/api'
import NativeSelectField from '@/components/NativeSelectField.vue'
import BankConnector from '@/components/BankConnector.vue'

const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const store = useWalletsStore()
const snackbar = useSnackbar()
const billingStore = useSubscriptionStore()
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
const typeOptions = [{ title: 'Efectivo', value: 'cash' }, { title: 'Banco', value: 'bank' }, { title: 'Crédito', value: 'credit' }]
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
  currency: 'USD',
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
