<template>
  <div>
    <div class="page-intro">
      <div class="page-intro__eyebrow">Tu cuenta</div>
      <h1 :class="isMobile ? 'text-h5' : 'text-h4'">Plan y facturación</h1>
      <p class="page-intro__subtitle">Consulta tu prueba, administra la suscripción y revisa los cobros.</p>
    </div>

    <v-alert v-if="billingStore.error" type="error" variant="tonal" closable class="mb-5">
      {{ billingStore.error }}
    </v-alert>

    <v-row v-if="billingStore.loading && !status">
      <v-col cols="12" md="7"><v-skeleton-loader type="card, article" /></v-col>
      <v-col cols="12" md="5"><v-skeleton-loader type="card" /></v-col>
    </v-row>

    <v-row v-else-if="status">
      <v-col cols="12" md="7">
        <v-card class="subscription-card h-100">
          <v-card-text class="pa-6 pa-sm-8">
            <div class="d-flex flex-wrap align-start justify-space-between ga-4 mb-6">
              <div>
                <div class="text-overline text-primary font-weight-bold">Knexura Finanzas Personal</div>
                <div class="subscription-price">{{ formattedPrice }}<span>{{ periodSuffix }}</span></div>
              </div>
              <v-chip :color="statusColor" variant="tonal" size="large" :prepend-icon="statusIcon">
                {{ statusLabel }}
              </v-chip>
            </div>

            <div v-if="status.canCheckout && billingStore.plans.length" class="plan-selector mb-6">
              <v-item-group v-model="selectedPlanCode" mandatory>
                <v-row dense>
                  <v-col v-for="plan in billingStore.plans" :key="plan.code" cols="12" sm="4">
                    <v-item v-slot="{ isSelected, toggle }" :value="plan.code">
                      <v-card
                        :variant="isSelected ? 'tonal' : 'outlined'"
                        :color="isSelected ? 'primary' : undefined"
                        class="plan-option pa-3"
                        @click="toggle"
                      >
                        <div class="text-caption text-medium-emphasis">{{ planLabel(plan) }}</div>
                        <div class="text-h6 font-weight-bold">{{ planPrice(plan) }}</div>
                        <div v-if="plan.intervalCount > 1" class="text-caption text-success">
                          Ahorras 20% vs. mensual
                        </div>
                      </v-card>
                    </v-item>
                  </v-col>
                </v-row>
              </v-item-group>
            </div>

            <v-alert :type="statusAlertType" variant="tonal" class="mb-6">
              <div class="font-weight-bold">{{ statusHeadline }}</div>
              <div class="text-body-2 mt-1">{{ statusDescription }}</div>
            </v-alert>

            <div v-if="status.status === 'trialing'" class="mb-6">
              <div class="d-flex justify-space-between text-body-2 mb-2">
                <span>Periodo de prueba</span>
                <strong>{{ status.daysRemaining }} días restantes</strong>
              </div>
              <v-progress-linear :model-value="trialProgress" color="primary" height="10" rounded />
              <div class="text-caption text-medium-emphasis mt-2">
                Finaliza el {{ formatDate(status.trialEndsAt) }}. No se realizará ningún cobro durante la prueba.
              </div>
            </div>

            <v-list density="compact" class="subscription-features pa-0 mb-6">
              <v-list-item prepend-icon="mdi-check-circle-outline" title="Movimientos, cuentas y categorías ilimitadas" />
              <v-list-item prepend-icon="mdi-check-circle-outline" title="Presupuestos, metas y transacciones recurrentes" />
              <v-list-item prepend-icon="mdi-check-circle-outline" title="Reportes e insights financieros con IA" />
              <v-list-item
                prepend-icon="mdi-shield-lock-outline"
                :title="useAppleIAP ? 'Pago protegido por Apple' : 'Pago protegido por Mercado Pago'"
              />
            </v-list>

            <v-btn
              v-if="status.canCheckout"
              color="primary"
              size="large"
              block
              prepend-icon="mdi-credit-card-outline"
              :loading="billingStore.actionLoading"
              @click="startCheckout"
            >
              {{ status.status === 'incomplete' ? 'Continuar registro del pago' : 'Suscribirme por ' + formattedPrice }}
            </v-btn>

            <v-btn
              v-else-if="status.status === 'trialing'"
              color="primary"
              size="large"
              block
              disabled
              prepend-icon="mdi-clock-outline"
            >
              Disponible al finalizar la prueba
            </v-btn>

            <v-btn
              v-if="status.canCancel"
              variant="outlined"
              color="error"
              block
              class="mt-3"
              @click="cancelDialog = true"
            >
              Cancelar renovación
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="5">
        <v-card title="Resumen" class="mb-5">
          <v-card-text>
            <div class="summary-row">
              <span>Plan</span><strong>{{ status.plan.name }}</strong>
            </div>
            <div class="summary-row">
              <span>Precio</span><strong>{{ formattedPrice }}</strong>
            </div>
            <div class="summary-row">
              <span>Periodicidad</span><strong>{{ intervalLabel(status.plan.intervalCount) }}</strong>
            </div>
            <div v-if="status.currentPeriodEnd" class="summary-row">
              <span>{{ status.cancelAtPeriodEnd ? 'Acceso hasta' : 'Próximo cobro' }}</span>
              <strong>{{ formatDate(status.currentPeriodEnd) }}</strong>
            </div>
            <div v-if="status.graceEndsAt" class="summary-row">
              <span>Fin del periodo de gracia</span><strong>{{ formatDate(status.graceEndsAt) }}</strong>
            </div>
          </v-card-text>
        </v-card>

        <v-card title="¿Acabas de pagar?">
          <v-card-text>
            <p class="text-body-2 text-medium-emphasis mb-4">
              La confirmación suele ser automática. También puedes verificar el estado manualmente.
            </p>
            <v-btn
              variant="outlined"
              color="primary"
              block
              prepend-icon="mdi-refresh"
              :loading="billingStore.actionLoading"
              @click="verifyPayment"
            >
              Verificar estado
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card title="Historial de cobros">
          <v-card-text v-if="!billingStore.payments.length" class="text-center text-medium-emphasis py-8">
            Todavía no hay cobros registrados.
          </v-card-text>
          <v-table v-else>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Importe</th>
                <th>Referencia</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="payment in billingStore.payments" :key="payment._id">
                <td>{{ formatDate(payment.paidAt || payment.createdAt) }}</td>
                <td><v-chip :color="paymentColor(payment.status)" size="small" variant="tonal">{{ paymentLabel(payment.status) }}</v-chip></td>
                <td>{{ formatCurrency(payment.amount, payment.currency) }}</td>
                <td class="text-caption">{{ payment.providerPaymentId || payment.providerInvoiceId }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="cancelDialog" max-width="480">
      <v-card title="Cancelar renovación">
        <v-card-text>
          No se realizarán nuevos cobros. Conservarás acceso hasta terminar el periodo que ya pagaste.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelDialog = false">Volver</v-btn>
          <v-btn color="error" :loading="billingStore.actionLoading" @click="confirmCancel">Confirmar cancelación</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { useSnackbar } from '@/stores/snackbar'

const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const route = useRoute()
const router = useRouter()
const billingStore = useSubscriptionStore()
const snackbar = useSnackbar()
const cancelDialog = ref(false)
const status = computed(() => billingStore.status)
const useAppleIAP = computed(() => billingStore.isAppleIAPAvailable())
const selectedPlanCode = ref(null)
const selectedPlan = computed(() => billingStore.plans.find((p) => p.code === selectedPlanCode.value))

const INTERVAL_LABELS = { 1: 'Mensual', 3: 'Trimestral', 12: 'Anual' }
const intervalLabel = (count) => INTERVAL_LABELS[count] || `Cada ${count} meses`
const PERIOD_SUFFIXES = { 1: '/mes', 3: '/trimestre', 12: '/año' }
const periodSuffixFor = (count) => PERIOD_SUFFIXES[count] || `/${count} meses`
const planLabel = (plan) => intervalLabel(plan.intervalCount)
const planPrice = (plan) => (useAppleIAP.value ? `US$${plan.usdAmount}` : formatCurrency(plan.amount, plan.currency))

const formattedPrice = computed(() => {
  if (status.value?.canCheckout && selectedPlan.value) return planPrice(selectedPlan.value)
  return formatCurrency(status.value?.plan?.amount || 15000, status.value?.plan?.currency || 'COP')
})
const periodSuffix = computed(() => {
  const count = status.value?.canCheckout
    ? selectedPlan.value?.intervalCount
    : status.value?.plan?.intervalCount
  return periodSuffixFor(count || 3)
})
const trialProgress = computed(() => {
  const trialDays = status.value?.trialDays ?? 45
  const remaining = status.value?.daysRemaining ?? trialDays
  if (trialDays === 0) return 100
  return Math.min(100, Math.max(0, ((trialDays - remaining) / trialDays) * 100))
})

const statusLabel = computed(() => ({
  trialing: 'Prueba gratuita',
  active: 'Suscripción activa',
  past_due: 'Pago pendiente',
  canceled: 'Renovación cancelada',
  incomplete: 'Registro pendiente',
  expired: 'Prueba vencida',
  exempt: 'Plan de cortesía',
}[status.value?.status] || 'Sin estado'))
const statusColor = computed(() => ({
  trialing: 'info', active: 'success', past_due: 'warning', canceled: 'warning',
  incomplete: 'warning', expired: 'error', exempt: 'success',
}[status.value?.status] || 'default'))
const statusIcon = computed(() => ({
  trialing: 'mdi-clock-outline', active: 'mdi-check-decagram-outline', past_due: 'mdi-alert-outline',
  canceled: 'mdi-calendar-remove-outline', incomplete: 'mdi-credit-card-clock-outline',
  expired: 'mdi-lock-outline', exempt: 'mdi-star-outline',
}[status.value?.status] || 'mdi-information-outline'))
const statusAlertType = computed(() => ({
  active: 'success', trialing: 'info', exempt: 'success', past_due: 'warning',
  canceled: 'warning', incomplete: 'warning', expired: 'error',
}[status.value?.status] || 'info'))
const statusHeadline = computed(() => ({
  trialing: 'Disfruta todas las funciones durante tu prueba',
  active: 'Tu suscripción está al día',
  past_due: 'Necesitamos actualizar tu pago',
  canceled: 'La renovación automática está cancelada',
  incomplete: 'Falta completar el método de pago',
  expired: 'Tu periodo de prueba terminó',
  exempt: 'Tu cuenta tiene acceso de cortesía',
}[status.value?.status] || 'Estado de la suscripción'))
const statusDescription = computed(() => {
  if (status.value?.status === 'trialing') return `Tienes ${status.value.daysRemaining} días para seguir usando Knexura Finanzas sin costo.`
  if (status.value?.status === 'active') return `El próximo periodo se renovará por ${formattedPrice.value}.`
  if (status.value?.status === 'past_due') return 'Conservas acceso temporal durante el periodo de gracia mientras solucionas el cobro.'
  if (status.value?.status === 'canceled') return `Tu acceso continuará hasta el ${formatDate(status.value.currentPeriodEnd)}.`
  if (status.value?.status === 'incomplete') return 'Regresa al checkout seguro para finalizar la suscripción.'
  if (status.value?.status === 'expired') return 'Suscríbete para recuperar el acceso a tus funciones financieras. Tus datos siguen guardados.'
  return status.value?.statusReason || 'Tu acceso está habilitado.'
})

function formatCurrency(amount, currency = 'COP') {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(amount || 0)
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(value))
}

const paymentLabel = (value) => ({
  approved: 'Aprobado', pending: 'Pendiente', rejected: 'Rechazado', canceled: 'Cancelado',
  refunded: 'Reembolsado', charged_back: 'Contracargo',
}[value] || value)
const paymentColor = (value) => ({
  approved: 'success', pending: 'warning', rejected: 'error', canceled: 'default',
  refunded: 'info', charged_back: 'error',
}[value] || 'default')

const startCheckout = async () => {
  const planCode = selectedPlanCode.value
  const result = useAppleIAP.value
    ? await billingStore.purchaseWithApple(planCode)
    : await billingStore.createCheckout(planCode)
  if (!result.success) snackbar.error(result.message)
}

const verifyPayment = async () => {
  const result = await billingStore.sync()
  await billingStore.fetchPayments()
  if (!result.success) return snackbar.error(result.message)
  if (result.status.status === 'active') snackbar.success('Pago confirmado. Tu suscripción está activa.')
  else snackbar.info('El pago todavía está en proceso. Intenta nuevamente en unos minutos.')
}

const confirmCancel = async () => {
  const result = await billingStore.cancel()
  cancelDialog.value = false
  if (result.success) snackbar.success('La renovación fue cancelada')
  else snackbar.error(result.message)
}

onMounted(async () => {
  await billingStore.fetchStatus(true)
  await billingStore.fetchPayments()
  await billingStore.fetchPlans()
  selectedPlanCode.value = status.value?.plan?.code
    || billingStore.plans.find((p) => p.code === 'personal-quarterly')?.code
    || billingStore.plans[0]?.code
    || null
  if (route.query.checkout === 'return') {
    await verifyPayment()
    await router.replace({ name: 'Subscription' })
  }
})
</script>

<style scoped>
.subscription-card {
  overflow: hidden;
  background: radial-gradient(circle at 100% 0, rgba(21, 154, 114, 0.1), transparent 22rem), #fff;
}

.subscription-price {
  color: var(--finance-ink);
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.05em;
}

.subscription-price span {
  margin-left: 6px;
  color: var(--finance-muted);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0;
}

.subscription-features :deep(.v-list-item__prepend) {
  color: var(--finance-primary);
}

.plan-option {
  cursor: pointer;
  text-align: center;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 12px 0;
  border-bottom: 1px solid var(--finance-line);
  font-size: 0.9rem;
}

.summary-row:last-child {
  border-bottom: 0;
}

.summary-row span {
  color: var(--finance-muted);
}

.summary-row strong {
  text-align: right;
}
</style>
