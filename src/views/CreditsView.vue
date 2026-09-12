<template>
  <div>
    <div class="page-intro d-flex align-start align-sm-center flex-column flex-sm-row ga-3">
      <div>
        <div class="page-intro__eyebrow">Deudas bajo control</div>
        <h1 :class="isMobile ? 'text-h5' : 'text-h4'">Mis créditos</h1>
        <p class="page-intro__subtitle">Registra tus obligaciones, sigue el saldo y decide cuándo hacer abonos extra.</p>
      </div>
      <v-spacer />
      <v-btn v-if="!isMobile && !billingStore.isReadOnly" color="primary" prepend-icon="mdi-plus" @click="openCreate">Registrar crédito</v-btn>
    </div>

    <v-card v-if="store.credits.length === 0 && !store.loading" class="pa-8 text-center text-grey">
      <v-icon size="x-large" color="primary">mdi-bank-plus</v-icon>
      <div class="mt-2 text-body-1">Aún no tienes créditos registrados</div>
      <div class="text-caption mt-1">Agrega tus obligaciones actuales para conocer el plan de pagos y las cuotas que faltan.</div>
      <v-btn v-if="!billingStore.isReadOnly" color="primary" variant="text" class="mt-3" @click="openCreate">Registrar el primero</v-btn>
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
            <div class="credit-balance-label">Saldo de capital</div>
            <div :class="isMobile ? 'text-h5' : 'text-h4'" class="font-weight-bold">{{ money(credit.summary?.capitalBalance ?? credit.capitalBalance ?? credit.outstandingBalance, credit.currency) }}</div>
            <div class="text-caption text-medium-emphasis mt-1">Saldo total {{ credit.summary?.interestIsEstimated ? 'estimado' : 'actual' }}: <strong>{{ money(credit.summary?.totalBalance, credit.currency) }}</strong> (capital + intereses)</div>
            <v-progress-linear class="mt-3" color="primary" rounded height="8" :model-value="credit.summary?.progress || 0" />
            <div class="d-flex justify-space-between text-caption text-medium-emphasis mt-1">
              <span>{{ percent(credit.summary?.progress) }} pagado</span>
              <span>{{ credit.summary?.remainingInstallments || 0 }} cuotas restantes</span>
            </div>

            <div class="credit-metrics mt-4">
              <div><span>Cuota registrada</span><strong>{{ money(credit.installmentAmount, credit.currency) }}</strong></div>
              <div><span>Interés actual / estimado</span><strong>{{ money(credit.summary?.currentInterest, credit.currency) }}</strong></div>
              <div><span>Interés restante estimado</span><strong>{{ money(credit.summary?.totalRemainingInterest, credit.currency) }}</strong></div>
              <div><span>Cuotas pagadas</span><strong>{{ credit.installmentsPaid }} / {{ credit.termMonths }}</strong></div>
            </div>

            <div v-if="credit.summary?.calculation" class="text-caption text-medium-emphasis mt-3">
              Tasa anual registrada: <strong>{{ Number(credit.annualInterestRate || 0).toLocaleString('es-CO', { maximumFractionDigits: 4 }) }}%</strong>
              · Tasa mensual equivalente: <strong>{{ Number(credit.summary.calculation.monthlyRate || 0).toLocaleString('es-CO', { maximumFractionDigits: 4 }) }}%</strong>
            </div>

            <v-alert v-if="credit.summary?.calculation?.warnings?.length" class="mt-3" type="warning" variant="tonal" density="compact">
              <ul class="credit-advice"><li v-for="warning in credit.summary.calculation.warnings" :key="warning">{{ warning }}</li></ul>
            </v-alert>

            <v-alert v-if="credit.summary?.nextPaymentDate && credit.summary.status !== 'paid_off'" class="mt-3" :type="credit.summary.daysUntilNextPayment < 0 ? 'error' : credit.summary.daysUntilNextPayment <= 7 ? 'warning' : 'info'" variant="tonal" density="compact">
              <strong>{{ credit.summary.daysUntilNextPayment < 0 ? `Pago vencido hace ${Math.abs(credit.summary.daysUntilNextPayment)} días` : `Próximo pago: ${formatDate(credit.summary.nextPaymentDate)}` }}</strong>
              <span v-if="credit.summary.daysUntilNextPayment >= 0"> · {{ money(credit.installmentAmount || credit.summary.nextPaymentAmount, credit.currency) }}</span>
            </v-alert>

            <v-alert v-if="credit.summary?.advice?.length" class="mt-3" type="success" variant="tonal" density="compact">
              <ul class="credit-advice"><li v-for="tip in credit.summary.advice.slice(0, 2)" :key="tip">{{ tip }}</li></ul>
            </v-alert>

            <v-expansion-panels variant="accordion" class="mt-3">
              <v-expansion-panel title="Ver plan de pagos">
                <v-expansion-panel-text>
                  <div v-if="credit.paymentPlan?.length" class="plan-scroll">
                    <v-table density="compact">
                      <thead><tr><th>Cuota</th><th>Fecha</th><th class="text-right">Pago</th><th class="text-right">Interés</th><th class="text-right">Saldo capital</th></tr></thead>
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
                    <div class="text-caption text-medium-emphasis mt-2">Mostrando las {{ credit.paymentPlan.length }} cuotas pendientes del crédito.</div>
                  </div>
                  <div v-else class="text-caption text-medium-emphasis">No hay cuotas pendientes.</div>
                </v-expansion-panel-text>
              </v-expansion-panel>
              <v-expansion-panel title="Historial de pagos">
                <v-expansion-panel-text>
                  <v-list v-if="credit.payments?.length" density="compact" bg-color="transparent">
                    <v-list-item v-for="payment in credit.payments.slice(0, 8)" :key="payment._id" :title="formatDate(payment.date)" :subtitle="payment.paymentType === 'extra' ? 'Abono extra' : 'Pago de cuota'">
                      <template #append>
                        <span class="text-green mr-2">{{ money(payment.amount, credit.currency) }}</span>
                        <v-btn v-if="!billingStore.isReadOnly" icon="mdi-delete-outline" size="x-small" variant="text" color="error" @click="removePayment(credit, payment)" />
                      </template>
                    </v-list-item>
                  </v-list>
                  <div v-else class="text-caption text-medium-emphasis">Aún no hay pagos registrados.</div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>

          <v-card-actions>
            <v-btn v-if="!billingStore.isReadOnly && credit.summary?.status !== 'paid_off'" size="small" color="primary" variant="tonal" prepend-icon="mdi-cash-check" @click="openPayment(credit)">Registrar pago</v-btn>
            <v-spacer />
            <v-btn v-if="!billingStore.isReadOnly" size="small" variant="text" icon="mdi-pencil" @click="openEdit(credit)" />
            <v-btn v-if="!billingStore.isReadOnly" size="small" variant="text" icon="mdi-delete" color="error" @click="confirmDelete(credit)" />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" :fullscreen="isMobile" max-width="620">
      <v-card :title="editing ? 'Editar crédito' : 'Registrar crédito'">
        <v-card-text>
          <v-row dense>
            <v-col cols="12" sm="7"><v-text-field v-model="form.name" label="Nombre del crédito" density="compact" required /></v-col>
            <v-col cols="12" sm="5"><NativeSelectField v-model="form.institutionCode" :items="institutionOptions" item-title="name" item-value="code" label="Entidad financiera" placeholder="Selecciona una entidad" @update:model-value="onInstitutionChange" /></v-col>
            <v-col v-if="form.institutionCode === 'other'" cols="12" sm="5"><v-text-field v-model="form.institutionName" label="Nombre de la entidad" density="compact" /></v-col>
            <v-col cols="12" sm="6"><NativeSelectField v-model="form.type" :items="typeOptions" label="Tipo de crédito" /></v-col>
            <v-col cols="12" sm="3"><v-text-field v-model="form.currency" label="Moneda" density="compact" maxlength="3" /></v-col>
            <v-col cols="12" sm="3"><v-text-field v-model.number="form.termMonths" label="Plazo (meses)" type="number" min="1" max="360" density="compact" /></v-col>
            <v-col cols="12" sm="6"><v-text-field v-model.number="form.principalAmount" label="Monto original" type="number" min="0" density="compact" prefix="$" /></v-col>
            <v-col cols="12" sm="6"><v-text-field v-model.number="form.capitalBalance" label="Saldo de capital actual" type="number" min="0" density="compact" prefix="$" hint="Solo el capital pendiente, sin sumar intereses." persistent-hint /></v-col>
            <v-col cols="12" sm="6"><v-text-field v-model.number="form.interestBalance" label="Intereses pendientes actuales" type="number" min="0" density="compact" prefix="$" hint="Intereses ya causados que aún no has pagado. El plan calcula los futuros." persistent-hint /></v-col>
            <v-col cols="12" sm="4"><v-text-field v-model.number="form.installmentAmount" label="Cuota mensual" type="number" min="0" density="compact" prefix="$" /></v-col>
            <v-col cols="12" sm="4"><v-text-field v-model.number="form.annualInterestRate" label="Tasa" type="number" min="0" step="0.01" density="compact" suffix="%" /></v-col>
            <v-col cols="12" sm="4"><NativeSelectField v-model="form.ratePeriod" :items="rateOptions" label="Periodo de tasa" /></v-col>
            <v-col cols="12" sm="4"><v-text-field v-model.number="form.installmentsPaid" label="Cuotas pagadas" type="number" min="0" density="compact" /></v-col>
            <v-col cols="12" sm="4"><v-text-field v-model="form.startDate" label="Fecha de inicio" type="date" density="compact" /></v-col>
            <v-col cols="12" sm="4"><v-text-field v-model="form.firstPaymentDate" label="Primer pago" type="date" density="compact" /></v-col>
            <v-col cols="12" sm="4"><v-text-field v-model="form.nextPaymentDate" label="Próximo pago" type="date" density="compact" /></v-col>
            <v-col cols="12" sm="4"><v-text-field v-model.number="form.paymentDay" label="Día habitual de pago" type="number" min="1" max="28" density="compact" /></v-col>
            <v-col cols="12"><v-textarea v-model="form.notes" label="Notas" rows="2" density="compact" /></v-col>
          </v-row>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="dialog = false">Cancelar</v-btn><v-btn color="primary" :loading="saving" @click="save">Guardar</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="paymentDialog" :fullscreen="isMobile" max-width="500">
      <v-card :title="`Registrar pago · ${paymentCredit?.name || ''}`">
        <v-card-text>
          <v-alert v-if="paymentCredit" type="info" variant="tonal" density="compact" class="mb-4">Capital: <strong>{{ money(paymentCredit.summary?.capitalBalance, paymentCredit.currency) }}</strong> · Total actual: <strong>{{ money(paymentCredit.summary?.totalBalance, paymentCredit.currency) }}</strong></v-alert>
          <v-text-field v-model.number="paymentForm.amount" label="Monto pagado" type="number" min="0" density="compact" prefix="$" required />
          <v-text-field v-model.number="paymentForm.interestAmount" label="Parte correspondiente a intereses (opcional)" type="number" min="0" density="compact" prefix="$" hint="Si lo dejas vacío, se aplica primero el interés pendiente estimado y el resto a capital." persistent-hint />
          <NativeSelectField v-model="paymentForm.paymentType" :items="paymentTypeOptions" label="Tipo de pago" />
          <v-text-field v-model="paymentForm.date" label="Fecha del pago" type="date" density="compact" />
          <NativeSelectField v-model="paymentForm.wallet" :items="wallets" item-title="name" item-value="_id" label="Cuenta desde la que pagaste (opcional)" placeholder="No descontar una cuenta" />
          <v-text-field v-model="paymentForm.description" label="Descripción" density="compact" />
          <v-textarea v-model="paymentForm.notes" label="Notas" rows="2" density="compact" />
          <div class="text-caption text-medium-emphasis">El pago se registrará como un gasto. Si seleccionas una cuenta, también se descontará de su saldo.</div>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="paymentDialog = false">Cancelar</v-btn><v-btn color="primary" :loading="paymentSaving" @click="savePayment">Guardar pago</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card title="Eliminar crédito"><v-card-text>¿Eliminar este crédito? El historial de movimientos de tus cuentas no se borrará.</v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn><v-btn color="error" :loading="deleting" @click="doDelete">Eliminar</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-btn v-if="isMobile && !billingStore.isReadOnly" icon="mdi-plus" color="primary" size="x-large" class="finance-fab" @click="openCreate" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useCreditsStore } from '@/stores/credits'
import { useSnackbar } from '@/stores/snackbar'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { walletsAPI, financialInstitutionsAPI } from '@/api'
import NativeSelectField from '@/components/NativeSelectField.vue'

const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const store = useCreditsStore()
const snackbar = useSnackbar()
const billingStore = useSubscriptionStore()
const wallets = ref([])
const institutions = ref([])
const dialog = ref(false)
const paymentDialog = ref(false)
const deleteDialog = ref(false)
const editing = ref(null)
const deleting = ref(false)
const toDelete = ref(null)
const paymentCredit = ref(null)
const saving = ref(false)
const paymentSaving = ref(false)

const typeLabels = { personal: 'Personal', vehicle: 'Vehículo', mortgage: 'Vivienda', education: 'Educativo', business: 'Negocio', other: 'Otro' }
const statusLabels = { active: 'Activo', paused: 'Pausado', paid_off: 'Pagado' }
const typeOptions = Object.entries(typeLabels).map(([value, title]) => ({ value, title }))
const rateOptions = [{ value: 'annual_effective', title: 'Efectiva anual' }, { value: 'monthly', title: 'Mensual' }]
const paymentTypeOptions = [{ value: 'installment', title: 'Pago de cuota' }, { value: 'extra', title: 'Abono extra a capital' }]
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

const money = (value, currency = 'COP') => new Intl.NumberFormat('es-CO', { style: 'currency', currency: currency || 'COP', maximumFractionDigits: 0 }).format(Number(value || 0))
const percent = (value) => `${Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`
const formatDate = (value) => value ? new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Sin fecha'

const onInstitutionChange = (code) => {
  const institution = institutions.value.find((item) => item.code === code)
  if (!institution) return
  form.value.institutionName = institution.code === 'other' ? '' : institution.name
  form.value.institutionLogo = institution.logo || ''
  form.value.lender = form.value.institutionName
}

const openCreate = () => { editing.value = null; form.value = emptyForm(); dialog.value = true }
const openEdit = (credit) => {
  editing.value = credit._id
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
    if (editing.value) { await store.update(editing.value, form.value); snackbar.success('Crédito actualizado') }
    else { await store.create(form.value); snackbar.success('Crédito registrado') }
    dialog.value = false
  } catch (err) { snackbar.error(err?.response?.data?.message || 'No fue posible guardar el crédito') }
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
    snackbar.success('Pago registrado y saldo actualizado')
    paymentDialog.value = false
  } catch (err) { snackbar.error(err?.response?.data?.message || 'No fue posible registrar el pago') }
  paymentSaving.value = false
}
const removePayment = async (credit, payment) => {
  if (!window.confirm('¿Eliminar este pago y revertir el abono al crédito?')) return
  try { await store.deletePayment(credit._id, payment._id); snackbar.success('Pago eliminado') }
  catch (err) { snackbar.error(err?.response?.data?.message || 'No fue posible eliminar el pago') }
}
const confirmDelete = (credit) => { toDelete.value = credit._id; deleteDialog.value = true }
const doDelete = async () => {
  deleting.value = true
  try { await store.remove(toDelete.value); snackbar.success('Crédito eliminado'); deleteDialog.value = false }
  catch (err) { snackbar.error(err?.response?.data?.message || 'No fue posible eliminar el crédito') }
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
</style>
