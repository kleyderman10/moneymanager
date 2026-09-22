<template>
  <div class="dashboard-page">
    <header class="dashboard-welcome d-flex align-start align-sm-center flex-column flex-sm-row ga-3">
      <div>
        <div class="page-intro__eyebrow">{{ t('dashboard.financialSummary') }}</div>
        <h1 :class="isMobile ? 'text-h5' : 'text-h4'">{{ t('dashboard.title') }}</h1>
        <p class="page-intro__subtitle">{{ t('dashboard.subtitle', { period: periodLabel }) }}</p>
      </div>
      <v-spacer />
      <v-btn
        v-if="!isMobile && !billingStore.isReadOnly"
        color="primary"
        size="large"
        prepend-icon="mdi-plus"
        @click="goToNewTransaction"
      >
        {{ t('dashboard.logTransaction') }}
      </v-btn>
    </header>

    <v-row v-if="summary" class="mb-3">
      <v-col cols="12">
        <v-card class="dashboard-hero">
          <v-card-text class="pa-6 pa-md-7">
            <div class="dashboard-hero__label">{{ t('dashboard.netWorth') }}</div>
            <div class="dashboard-hero__amount">{{ money(netWorth) }}</div>

            <div class="dashboard-hero__meta">
              <div>
                <span><v-icon size="14" color="success">mdi-arrow-top-right</v-icon> {{ t('dashboard.avgIncome') }}</span>
                <strong>{{ money(cashFlow?.averageIncome) }}</strong>
              </div>
              <div>
                <span><v-icon size="14" color="error">mdi-arrow-bottom-right</v-icon> {{ t('dashboard.avgExpenses') }}</span>
                <strong>{{ money(cashFlow?.averageExpenses) }}</strong>
              </div>
            </div>

            <v-progress-linear
              v-if="cashFlow"
              class="dashboard-hero__spend mt-4"
              :model-value="spentRatio"
              :color="spentRatioColor"
              bg-color="rgba(255,255,255,0.16)"
              height="6"
              rounded
            />
            <div v-if="cashFlow" class="dashboard-hero__surplus">
              {{ t('dashboard.monthlySurplus', { amount: money(cashFlow.averageSurplus), margin: surplusMargin }) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col v-if="topInsight" cols="12">
        <v-alert
          type="warning"
          variant="tonal"
          density="comfortable"
          icon="mdi-lightbulb-on-outline"
          closable
          class="dashboard-tip"
          @click:close="dismissTopInsight"
        >
          {{ topInsight.description || topInsight.title }}
        </v-alert>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="metric-card metric-card--income">
          <v-card-text>
            <div class="metric-card__icon"><v-icon>mdi-arrow-down-left</v-icon></div>
            <div>
              <div class="metric-card__label">{{ t('dashboard.income') }}</div>
              <div class="metric-card__value">{{ money(summary.totalIncome) }}</div>
              <div class="metric-card__hint">{{ t('dashboard.movCount', { count: summary.incomeCount }) }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-card class="metric-card metric-card--expense">
          <v-card-text>
            <div class="metric-card__icon"><v-icon>mdi-arrow-up-right</v-icon></div>
            <div>
              <div class="metric-card__label">{{ t('dashboard.expenses') }}</div>
              <div class="metric-card__value">{{ money(summary.totalExpenses) }}</div>
              <div class="metric-card__hint">{{ t('dashboard.movCount', { count: summary.expenseCount }) }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="metric-card metric-card--activity">
          <v-card-text>
            <div class="metric-card__icon"><v-icon>mdi-swap-vertical</v-icon></div>
            <div>
              <div class="metric-card__label">{{ t('dashboard.monthActivity') }}</div>
              <div class="metric-card__value">{{ t('dashboard.transactionCount', { count: summary.transactionCount }) }}</div>
              <div class="metric-card__hint">{{ t('dashboard.allRecorded') }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-else class="mb-3">
      <v-col cols="12" md="6"><v-skeleton-loader type="image" height="220" /></v-col>
      <v-col cols="12" md="6"><v-skeleton-loader type="article, article" /></v-col>
    </v-row>

    <v-row class="mb-3">
      <v-col cols="12" lg="8">
        <v-card class="section-card">
          <v-card-title class="d-flex align-center">
            <span class="section-icon mr-3"><v-icon size="20">mdi-lightning-bolt-outline</v-icon></span>
            <div>
              <div class="text-body-1">{{ t('dashboard.quickActions') }}</div>
              <div class="text-caption text-medium-emphasis font-weight-regular">{{ t('dashboard.quickActionsSubtitle') }}</div>
            </div>
          </v-card-title>
          <v-card-text class="pa-3 pa-md-4">
            <div class="quick-actions">
              <button v-if="!billingStore.isReadOnly" type="button" class="quick-action" @click="goToNewTransaction">
                <span class="quick-action__icon"><v-icon>mdi-plus</v-icon></span>
                <span class="text-left"><strong>{{ t('dashboard.newTransaction') }}</strong><span>{{ t('dashboard.newTransactionHint') }}</span></span>
              </button>
              <button v-if="!billingStore.isReadOnly" type="button" class="quick-action" @click="router.push('/budgets')">
                <span class="quick-action__icon"><v-icon>mdi-chart-pie-outline</v-icon></span>
                <span class="text-left"><strong>{{ t('dashboard.createBudget') }}</strong><span>{{ t('dashboard.createBudgetHint') }}</span></span>
              </button>
              <button type="button" class="quick-action" @click="router.push('/reports')">
                <span class="quick-action__icon"><v-icon>mdi-chart-line</v-icon></span>
                <span class="text-left"><strong>{{ t('dashboard.viewReports') }}</strong><span>{{ t('dashboard.viewReportsHint') }}</span></span>
              </button>
              <button type="button" class="quick-action" @click="router.push('/simulators')">
                <span class="quick-action__icon"><v-icon>mdi-calculator-variant-outline</v-icon></span>
                <span class="text-left"><strong>{{ t('dashboard.simulate') }}</strong><span>{{ t('dashboard.simulateHint') }}</span></span>
              </button>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" lg="4">
        <AIHealthScore :score="insightsStore.healthScore" />
      </v-col>
    </v-row>

    <AIInsightsCard :loading="insightsStore.loading" />

    <v-row class="mt-1">
      <v-col cols="12" md="6">
        <v-card class="section-card">
          <v-card-title class="d-flex align-center">
            <span class="section-icon mr-3"><v-icon size="20">mdi-calendar-clock-outline</v-icon></span>
            <div>
              <div class="text-body-1">{{ t('dashboard.upcomingPayments') }}</div>
              <div class="text-caption text-medium-emphasis font-weight-regular">{{ t('dashboard.upcomingPaymentsSubtitle') }}</div>
            </div>
          </v-card-title>
          <v-card-text v-if="upcomingPayments.length === 0" class="finance-empty text-center">
            <div>
              <v-icon size="38" color="grey-lighten-1">mdi-calendar-check-outline</v-icon>
              <div class="mt-2 text-body-2">{{ t('dashboard.noUpcomingPayments') }}</div>
              <div class="text-caption">{{ t('dashboard.upToDateAgenda') }}</div>
            </div>
          </v-card-text>
          <v-list v-else bg-color="transparent" density="comfortable">
            <v-list-item
              v-for="item in upcomingPayments.slice(0, 5)"
              :key="item.id"
              :title="item.title"
              :subtitle="item.tag ? `${item.tag} · ${formatDate(item.date)}` : formatDate(item.date)"
            >
              <template #prepend>
                <v-avatar :color="item.isIncome ? 'success' : 'error'" variant="tonal" size="38">
                  <v-icon size="19">{{ item.icon }}</v-icon>
                </v-avatar>
              </template>
              <template #append>
                <strong :class="item.isIncome ? 'text-success' : 'text-error'">
                  {{ item.isIncome ? '+' : '−' }}{{ money(item.amount) }}
                </strong>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card class="section-card">
          <v-card-title class="d-flex align-center">
            <span class="section-icon mr-3"><v-icon size="20">mdi-chart-donut</v-icon></span>
            <div>
              <div class="text-body-1">{{ t('dashboard.expensesByCategory') }}</div>
              <div class="text-caption text-medium-emphasis font-weight-regular">{{ t('dashboard.expensesByCategorySubtitle') }}</div>
            </div>
          </v-card-title>
          <v-card-text v-if="expenseCategories.length === 0" class="finance-empty text-center">
            <div>
              <v-icon size="38" color="grey-lighten-1">mdi-chart-donut</v-icon>
              <div class="mt-2 text-body-2">{{ t('dashboard.notEnoughData') }}</div>
              <div class="text-caption">{{ t('dashboard.notEnoughDataHint') }}</div>
            </div>
          </v-card-text>
          <v-card-text v-else>
            <CategoryDonutChart :categories="expenseCategories.slice(0, 5)" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-btn
      v-if="isMobile && !billingStore.isReadOnly"
      color="primary"
      icon="mdi-plus"
      class="finance-fab"
      :aria-label="t('dashboard.logTransaction')"
      @click="goToNewTransaction"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import { summaryAPI, recurringAPI, creditsAPI, walletsAPI, simulationsAPI } from '@/api'
import { useAiInsights } from '@/stores/aiInsights'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { useLocale } from '@/composables/useLocale'
import AIInsightsCard from '@/components/AIInsightsCard.vue'
import AIHealthScore from '@/components/AIHealthScore.vue'
import CategoryDonutChart from '@/components/CategoryDonutChart.vue'

const { t } = useI18n()
const { money, dateLong } = useLocale()
const router = useRouter()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const insightsStore = useAiInsights()
const billingStore = useSubscriptionStore()

const goToNewTransaction = () => {
  router.push({ path: '/transactions', query: { create: '1' } })
}

const summary = ref(null)
const upcoming = ref([])
const credits = ref([])
const creditCards = ref([])
const wallets = ref([])
const cashFlow = ref(null)

const periodLabel = computed(() => dateLong(new Date(), { month: 'long' }))
const savingsRate = computed(() => {
  if (!summary.value?.totalIncome) return 0
  return Math.round((summary.value.balance / summary.value.totalIncome) * 100)
})

const expenseCategories = computed(() =>
  summary.value?.byCategory?.filter((category) => category.type === 'expense') || []
)

// "Patrimonio" only counts real money the person holds (cash/bank), not credit
// cards — a card's balance is debt, not net worth.
const netWorth = computed(() => wallets.value
  .filter((wallet) => wallet.type !== 'credit')
  .reduce((sum, wallet) => sum + (Number(wallet.balance) || 0), 0))

// Reuses the same average income/expense/surplus the "Capacidad crediticia" simulator
// computes, instead of deriving a second version of the same numbers here.
const spentRatio = computed(() => {
  if (!cashFlow.value?.averageIncome) return 0
  return Math.min(100, Math.round((cashFlow.value.averageExpenses / cashFlow.value.averageIncome) * 100))
})
const spentRatioColor = computed(() => {
  if (spentRatio.value >= 90) return 'error'
  if (spentRatio.value >= 70) return 'warning'
  return 'success'
})
const surplusMargin = computed(() => {
  if (!cashFlow.value?.averageIncome) return ''
  const ratio = cashFlow.value.averageSurplus / cashFlow.value.averageIncome
  if (ratio < 0) return t('dashboard.marginNone')
  if (ratio < 0.1) return t('dashboard.marginTight')
  if (ratio < 0.3) return t('dashboard.marginComfortable')
  return t('dashboard.marginWide')
})

const topInsight = computed(() => insightsStore.insights[0] || null)
const dismissTopInsight = () => {
  if (topInsight.value) insightsStore.dismissInsight(topInsight.value._id)
}

const UPCOMING_WINDOW_DAYS = 7
const upcomingPayments = computed(() => {
  const items = upcoming.value.map((item) => ({
    id: `recurring-${item._id}`,
    title: item.description || item.category?.name || t('dashboard.recurringTransaction'),
    date: item.nextOccurrence,
    amount: item.amount,
    isIncome: item.type === 'income',
    icon: item.type === 'income' ? 'mdi-arrow-down-left' : 'mdi-arrow-up-right',
    tag: null,
  }))

  for (const credit of credits.value) {
    const days = credit.summary?.daysUntilNextPayment
    if (credit.status !== 'paid_off' && credit.summary?.nextPaymentDate && days !== undefined && days <= UPCOMING_WINDOW_DAYS) {
      items.push({
        id: `credit-${credit._id}`,
        title: credit.name || t('nav.credits'),
        date: credit.summary.nextPaymentDate,
        amount: credit.installmentAmount || credit.summary.nextPaymentAmount,
        isIncome: false,
        icon: 'mdi-bank-outline',
        tag: t('nav.credits'),
      })
    }
  }

  for (const wallet of creditCards.value) {
    const days = wallet.creditSummary?.daysUntilPayment
    if (wallet.creditSummary?.nextPaymentDate && days !== undefined && days <= UPCOMING_WINDOW_DAYS) {
      items.push({
        id: `card-${wallet._id}`,
        title: wallet.name || t('dashboard.creditCard'),
        date: wallet.creditSummary.nextPaymentDate,
        amount: wallet.creditSummary.minimumPayment,
        isIncome: false,
        icon: 'mdi-credit-card-outline',
        tag: t('dashboard.card'),
      })
    }
  }

  return items.sort((a, b) => new Date(a.date) - new Date(b.date))
})

const PROCESS_THROTTLE_KEY = 'mm_last_recurring_process'
const tryProcessRecurring = () => {
  const last = localStorage.getItem(PROCESS_THROTTLE_KEY)
  if (last && Date.now() - Number(last) < 60 * 60 * 1000) return
  localStorage.setItem(PROCESS_THROTTLE_KEY, String(Date.now()))
  recurringAPI.processRecurring().catch(() => {})
}

const formatDate = (date) => date ? dateLong(date, { weekday: 'short', day: 'numeric', month: 'short' }) : ''

const load = async () => {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
  try {
    const [summaryResponse, upcomingResponse, creditsResponse, walletsResponse, cashFlowResponse] = await Promise.all([
      summaryAPI.get({ startDate, endDate }),
      recurringAPI.getUpcoming(7),
      creditsAPI.getAll(),
      walletsAPI.getAll(),
      simulationsAPI.capacity({}).catch(() => null),
    ])
    summary.value = summaryResponse.data
    upcoming.value = upcomingResponse.data
    credits.value = creditsResponse.data
    wallets.value = walletsResponse.data
    creditCards.value = walletsResponse.data.filter((wallet) => wallet.type === 'credit')
    cashFlow.value = cashFlowResponse?.data?.capacity || null
    tryProcessRecurring()
  } catch { /* El estado vacío mantiene la pantalla utilizable si no hay conexión. */ }
}

onMounted(() => {
  load()
  insightsStore.fetchInsights()
  insightsStore.fetchHealthScore()
})
</script>
