<template>
  <div>
    <div data-tour="page-intro" class="page-intro">
      <div class="page-intro__eyebrow">{{ t('reports.financialAnalysis') }}</div>
      <h1 :class="isMobile ? 'text-h5' : 'text-h4'">{{ t('nav.reports') }}</h1>
      <p class="page-intro__subtitle">{{ t('reports.subtitle') }}</p>
    </div>

    <KfSegmented v-model="tab" :options="tabOptions" :block="isMobile" class="mb-4" data-tour="page-tabs" />

    <v-card v-if="tab === 'monthly'">
      <v-card-text class="pa-2 pa-md-4">
        <v-row dense>
          <v-col cols="6" sm="5">
            <v-select v-model="monthlyMonth" data-tour="reports-period" :items="monthOptions" :label="t('budgets.month')" density="compact" hide-details @update:model-value="loadMonthly" />
          </v-col>
          <v-col cols="6" sm="5">
            <v-text-field v-model="monthlyYear" :label="t('budgets.year')" type="number" density="compact" hide-details @update:model-value="loadMonthly" />
          </v-col>
        </v-row>

        <template v-if="monthlyReport">
          <v-row class="mt-2" dense>
            <v-col cols="6" md="3">
              <KpiCard :label="t('dashboard.income')" :value="money(monthlyReport.summary?.totalIncome)" icon="mdi-arrow-up" tone="income" />
            </v-col>
            <v-col cols="6" md="3">
              <KpiCard :label="t('dashboard.expenses')" :value="money(monthlyReport.summary?.totalExpenses)" icon="mdi-arrow-down" tone="expense" />
            </v-col>
            <v-col cols="6" md="3">
              <KpiCard
                :label="t('reports.balance')"
                :value="`${(monthlyReport.summary?.balance || 0) < 0 ? '−' : ''}${money(Math.abs(monthlyReport.summary?.balance || 0))}`"
                icon="mdi-database-outline"
                :tone="(monthlyReport.summary?.balance || 0) >= 0 ? 'primary' : 'expense'"
              />
            </v-col>
            <v-col cols="6" md="3">
              <KpiCard
                :label="t('reports.vsLastMonth')"
                :value="monthlyReport.expenseChange !== null ? (monthlyReport.expenseChange > 0 ? '+' : '') + monthlyReport.expenseChange + '%' : 'N/A'"
                icon="mdi-swap-vertical-variant"
                :tone="monthlyReport.expenseChange === null ? 'neutral' : monthlyReport.expenseChange > 0 ? 'expense' : 'income'"
              />
            </v-col>
          </v-row>

          <div v-if="spendCompositionVisible" class="spend-bar mt-3">
            <div class="spend-bar__track">
              <div class="spend-bar__fill" :style="{ width: spentPercentage + '%' }" />
              <span class="spend-bar__label">{{ t('reports.spent', { percent: percentDisplay(spentPercentage) }) }}</span>
            </div>
            <p class="spend-bar__caption">{{ spendCaptionText }}</p>
          </div>

          <h3 class="mt-5 mb-2">{{ t('nav.budgets') }}</h3>
          <v-row v-if="monthlyReport.budgetStatus?.length" dense>
            <v-col v-for="bs in monthlyReport.budgetStatus" :key="bs.budget._id" cols="12" sm="6" md="4">
              <BudgetCard
                :budget="bs.budget"
                :status="{ ...bs, remaining: Math.max(0, (bs.budget.amount || 0) - (bs.spent || 0)) }"
                :period="`${monthOptions.find(m => m.value === monthlyMonth)?.title || ''} ${monthlyYear}`"
                read-only
              />
            </v-col>
          </v-row>
          <v-card v-else class="pa-8 text-center text-grey">
            <v-icon size="x-large" color="grey">mdi-chart-donut</v-icon>
            <div class="mt-2">{{ t('reports.noBudgetsFor', { month: monthOptions.find(m => m.value === monthlyMonth)?.title || t('reports.thisMonth') }) }}</div>
            <div class="text-caption mt-1">{{ t('reports.createOneToCompare') }}</div>
            <v-btn v-if="!billingStore.isReadOnly" color="primary" variant="text" class="mt-2" @click="goToCreateBudget">+ {{ t('budgets.newBudget') }}</v-btn>
          </v-card>
        </template>
      </v-card-text>
    </v-card>

    <v-card v-if="tab === 'yearly'">
      <v-card-text class="pa-2 pa-md-4">
        <v-row dense>
          <v-col cols="8">
            <v-text-field v-model="yearlyYear" :label="t('budgets.year')" type="number" density="compact" hide-details @update:model-value="loadYearly" />
          </v-col>
          <v-col cols="4" class="d-flex align-center">
            <v-btn color="primary" @click="loadYearly" block size="small">{{ t('reports.view') }}</v-btn>
          </v-col>
        </v-row>

        <template v-if="yearlyReport">
          <div class="reports-chart mt-3">
            <Bar :data="yearlyChartData" :options="yearlyChartOptions" />
          </div>

          <v-table class="mt-3" density="compact">
            <thead><tr><th>{{ t('budgets.month') }}</th><th>{{ t('dashboard.income') }}</th><th>{{ t('dashboard.expenses') }}</th><th>{{ t('reports.balance') }}</th></tr></thead>
            <tbody>
              <tr v-for="m in yearlyReport.months" :key="m.month">
                <td>{{ monthNames[m.month - 1] }}</td>
                <td class="text-green">{{ money(m.totalIncome) }}</td>
                <td class="text-red">{{ money(m.totalExpenses) }}</td>
                <td :class="m.balance >= 0 ? 'text-green' : 'text-red'">{{ money(Math.abs(m.balance)) }}</td>
              </tr>
            </tbody>
          </v-table>
        </template>
      </v-card-text>
    </v-card>

    <v-card v-if="tab === 'ai'">
      <v-card-text class="pa-2 pa-md-4">
        <div class="text-center pa-4">
          <v-btn
            v-if="!billingStore.isReadOnly"
            color="primary"
            :loading="analysisLoading"
            prepend-icon="mdi-robot"
            @click="loadAnalysis"
          >
            {{ t('reports.generateAiAnalysis') }}
          </v-btn>
          <div class="text-caption text-grey mt-1">{{ t('reports.aiWillAnalyze') }}</div>
        </div>

        <template v-if="analysis">
          <v-alert type="info" variant="tonal" class="mb-2">
            {{ analysis.overview }}
          </v-alert>

          <v-card v-if="analysis.healthScore" class="mb-3">
            <v-card-title class="text-body-1">{{ t('reports.healthScore') }}</v-card-title>
            <v-card-text>
              <AIHealthScore :score="analysis.healthScore" />
            </v-card-text>
          </v-card>

          <h3 class="text-h6 mb-2">{{ t('reports.spendingPatterns') }}</h3>
          <v-row v-if="analysis.spendingPatterns?.length">
            <v-col v-for="p in analysis.spendingPatterns" :key="p.category" cols="12" sm="6" md="4">
              <v-card :color="getCategoryColor(p.category).bg" :style="{ color: getCategoryColor(p.category).text }">
                <v-card-text>
                  <div class="text-body-2 font-weight-medium">{{ p.category }}</div>
                  <div class="text-h6" :class="p.trend === 'up' ? 'text-error' : p.trend === 'down' ? 'text-success' : ''">
                    {{ p.trend === 'up' ? '↑' : p.trend === 'down' ? '↓' : '→' }} {{ p.percentage }}%
                  </div>
                  <div class="text-caption">{{ p.description }}</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <h3 v-if="analysis.anomalies?.length" class="text-h6 mb-2 mt-3">{{ t('reports.anomaliesDetected') }}</h3>
          <v-alert v-for="(a, i) in analysis.anomalies" :key="i" :type="a.severity === 'high' ? 'error' : 'warning'" variant="tonal" density="compact" class="mb-1">
            {{ a.description }}
          </v-alert>

          <h3 v-if="analysis.recommendations?.length" class="text-h6 mb-2 mt-3">{{ t('reports.recommendations') }}</h3>
          <v-list density="compact" bg-color="transparent">
            <v-list-item v-for="(r, i) in analysis.recommendations" :key="i" :title="r.title" :subtitle="r.description">
              <template #append>
                <v-chip :color="r.priority === 'high' ? 'error' : r.priority === 'medium' ? 'warning' : 'info'" size="x-small">
                  {{ t('reports.savings', { amount: money(r.potentialSaving || 0) }) }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>

          <h3 v-if="analysis.goalPredictions?.length" class="text-h6 mb-2 mt-3">{{ t('reports.goalPredictions') }}</h3>
          <v-row>
            <v-col v-for="g in analysis.goalPredictions" :key="g.name" cols="12" sm="6">
              <v-card variant="tonal" :color="goalStatusColor(g)">
                <v-card-text>
                  <div class="text-body-2">{{ g.name }}</div>
                  <div class="text-caption">{{ money(g.current) }} / {{ money(g.target) }}</div>
                  <v-progress-linear :model-value="goalProgress(g)" height="10" rounded class="my-2" :color="goalStatusColor(g)" />
                  <div class="text-caption d-flex align-center ga-1">
                    <v-icon v-if="isGoalComplete(g)" size="16">mdi-check-circle</v-icon>
                    {{ goalStatusLabel(g) }} · {{ t('reports.estimated', { date: g.estimatedCompletion }) }}
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <h3 v-if="analysis.projections" class="text-h6 mb-2 mt-3">{{ t('reports.nextMonthProjection') }}</h3>
          <v-row>
            <v-col cols="6">
              <v-card variant="tonal" color="income"><v-card-text class="text-center"><div class="text-caption">{{ t('reports.estIncome') }}</div><div class="text-h6">{{ money(analysis.projections.nextMonthIncome) }}</div></v-card-text></v-card>
            </v-col>
            <v-col cols="6">
              <v-card variant="tonal" color="expense"><v-card-text class="text-center"><div class="text-caption">{{ t('reports.estExpenses') }}</div><div class="text-h6">{{ money(analysis.projections.nextMonthExpenses) }}</div></v-card-text></v-card>
            </v-col>
          </v-row>
        </template>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { reportsAPI, aiAPI } from '@/api'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { useLocale } from '@/composables/useLocale'
import { getCategoryColor } from '@/constants/categoryColors'
import AIHealthScore from '@/components/AIHealthScore.vue'
import KfSegmented from '@/components/ui/KfSegmented.vue'
import KpiCard from '@/components/finance/KpiCard.vue'
import BudgetCard from '@/components/finance/BudgetCard.vue'
import { CHART } from '@/constants/chartTheme'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const { t, tm } = useI18n()
const { money, number, locale } = useLocale()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const billingStore = useSubscriptionStore()
const router = useRouter()
const tab = ref('monthly')
const tabOptions = computed(() => [
  { value: 'monthly', label: t('reports.monthly') },
  { value: 'yearly', label: t('reports.yearly') },
  { value: 'ai', label: t('reports.smartAnalysis') },
])
const now = new Date()

const monthlyMonth = ref(now.getMonth() + 1)
const monthlyYear = ref(now.getFullYear())
const yearlyYear = ref(now.getFullYear())
const monthlyReport = ref(null)
const yearlyReport = ref(null)
const analysis = ref(null)
const analysisLoading = ref(false)

const monthNames = computed(() => tm('common.monthsShort'))
const monthOptions = computed(() => monthNames.value.map((m, i) => ({ title: m, value: i + 1 })))
const percentDisplay = (value) => `${number(value, { maximumFractionDigits: 1 })}%`

const goToCreateBudget = () => router.push({ name: 'Budgets' })

const spendCompositionVisible = computed(() => Number(monthlyReport.value?.summary?.totalIncome) > 0)
const spentPercentage = computed(() => {
  const income = Number(monthlyReport.value?.summary?.totalIncome) || 0
  const expenses = Number(monthlyReport.value?.summary?.totalExpenses) || 0
  if (!income) return 0
  return Math.min(100, Math.round((expenses / income) * 1000) / 10)
})
const spendCaptionText = computed(() => {
  const balance = Number(monthlyReport.value?.summary?.balance) || 0
  if (balance < 0) return t('reports.spentMoreThanEarned', { amount: money(Math.abs(balance)) })
  const remainingPercentage = Math.max(0, Math.round((100 - spentPercentage.value) * 10) / 10)
  return t('reports.onlyLeftOver', { percent: percentDisplay(remainingPercentage), amount: money(balance) })
})

const yearlyChartData = computed(() => ({
  labels: (yearlyReport.value?.months || []).map((m) => monthNames.value[m.month - 1]),
  datasets: [
    { label: t('dashboard.income'), data: (yearlyReport.value?.months || []).map((m) => m.totalIncome), backgroundColor: CHART.income, borderRadius: 6 },
    { label: t('dashboard.expenses'), data: (yearlyReport.value?.months || []).map((m) => m.totalExpenses), backgroundColor: CHART.expense, borderRadius: 6 },
  ],
}))
const yearlyChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top', align: 'end', labels: { color: CHART.text } }, tooltip: { backgroundColor: CHART.tooltip, titleColor: CHART.text, bodyColor: CHART.text, borderColor: CHART.grid, borderWidth: 1 } },
  scales: {
    x: { grid: { display: false }, ticks: { color: CHART.muted } },
    y: { beginAtZero: true, grid: { color: CHART.grid }, ticks: { color: CHART.muted, callback: (v) => money(v) } },
  },
}))

const isGoalComplete = (g) => Number(g.current) >= Number(g.target)
const goalProgress = (g) => (Number(g.target) > 0 ? Math.min(100, Math.round((Number(g.current) / Number(g.target)) * 100)) : 0)
const goalStatusLabel = (g) => (isGoalComplete(g) ? t('reports.completed') : g.onTrack ? t('reports.onTrack') : t('reports.delayed'))
const goalStatusColor = (g) => (isGoalComplete(g) ? 'success' : g.onTrack ? 'success' : 'warning')

const loadMonthly = async () => { try { const res = await reportsAPI.monthly(monthlyYear.value, monthlyMonth.value); monthlyReport.value = res.data } catch { /* ignore */ } }
const loadYearly = async () => { try { const res = await reportsAPI.yearly(yearlyYear.value); yearlyReport.value = res.data } catch { /* ignore */ } }

const loadAnalysis = async () => {
  analysisLoading.value = true
  try {
    const res = await aiAPI.analyze()
    analysis.value = res.data
  } catch { /* ignore */ }
  analysisLoading.value = false
}

onMounted(() => { loadMonthly(); loadYearly() })
</script>

<style scoped>
.spend-bar__track {
  position: relative;
  height: 28px;
  overflow: hidden;
  border: 1px solid var(--kf-border-subtle);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
}

.spend-bar__fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 98, 109, 0.75), var(--kf-expense));
  transition: width 180ms ease;
}

.spend-bar__label {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  color: var(--kf-text);
  font-size: 0.76rem;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}

.spend-bar__caption {
  margin: 8px 0 0;
  color: var(--kf-text-secondary);
  font-size: 0.82rem;
}

.reports-chart {
  position: relative;
  height: 280px;
}

@media (max-width: 600px) {
  .reports-chart {
    height: 220px;
  }
}
</style>
