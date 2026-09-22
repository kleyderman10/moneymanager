<template>
  <div>
    <div class="investment-summary-grid mb-4">
      <v-card class="investment-summary-card">
        <v-card-text><span>{{ t('investment.finalBalance') }}</span><strong>{{ money(result.finalBalance) }}</strong></v-card-text>
      </v-card>
      <v-card class="investment-summary-card">
        <v-card-text><span>{{ t('investment.contributedMoney') }}</span><strong>{{ money(result.totalContributions) }}</strong></v-card-text>
      </v-card>
      <v-card class="investment-summary-card investment-summary-card--gain">
        <v-card-text><span>{{ t('investment.grossInterest') }}</span><strong>{{ money(result.totalInterest) }}</strong></v-card-text>
      </v-card>
    </div>

    <v-card :title="t('investment.projectedGrowth')">
      <v-card-text>
        <div class="investment-chart"><Line :data="chartData" :options="chartOptions" /></div>
        <div class="text-caption text-medium-emphasis mt-3">{{ result.disclaimer }}</div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { useLocale } from '@/composables/useLocale'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const props = defineProps({
  result: { type: Object, required: true },
  currency: { type: String, required: true },
})

const { t } = useI18n()
const { locale } = useLocale()

const money = (value) => new Intl.NumberFormat(locale.value, {
  style: 'currency',
  currency: props.currency,
  maximumFractionDigits: 0,
}).format(Number(value || 0))

const compactMoney = (value) => new Intl.NumberFormat(locale.value, {
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(Number(value || 0))

const chartData = computed(() => ({
  labels: props.result.projection.map((row) => row.period),
  datasets: [
    {
      label: t('investment.contributedMoney'),
      data: props.result.projection.map((row) => row.contributions),
      borderColor: '#3276b1',
      backgroundColor: 'rgba(50, 118, 177, 0.08)',
      pointRadius: 0,
      tension: 0.2,
    },
    {
      label: t('investment.balanceWithInterest'),
      data: props.result.projection.map((row) => row.balance),
      borderColor: '#159a72',
      backgroundColor: 'rgba(21, 154, 114, 0.12)',
      fill: true,
      pointRadius: 0,
      tension: 0.2,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: 'index' },
  plugins: { legend: { position: 'bottom' } },
  scales: {
    x: { title: { display: true, text: t('budgets.month') }, grid: { display: false } },
    y: {
      beginAtZero: true,
      title: { display: true, text: `${t('wallets.balance')} (${props.currency})` },
      ticks: { callback: compactMoney },
    },
  },
}))
</script>

<style scoped>
.investment-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.investment-summary-card {
  height: 100%;
}

.investment-summary-card--gain {
  background: #e9f6f2 !important;
}

.investment-summary-card span {
  display: block;
  color: var(--finance-muted);
  font-size: 0.72rem;
}

.investment-summary-card strong {
  display: block;
  margin-top: 5px;
  color: var(--finance-ink);
  font-size: clamp(1rem, 2vw, 1.25rem);
}

.investment-chart {
  position: relative;
  height: 300px;
}

@media (max-width: 600px) {
  .investment-summary-grid {
    grid-template-columns: 1fr;
  }

  .investment-chart {
    height: 250px;
  }
}
</style>
