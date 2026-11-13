<template>
  <div>
    <div class="d-flex flex-wrap ga-3 mb-4 align-center">
      <v-select
        v-model="rangeDays"
        :items="rangeOptions"
        :label="t('admin.stats.range')"
        density="compact"
        hide-details
        :style="isMobile ? 'flex: 1 1 45%' : 'max-width: 190px'"
        @update:model-value="load"
      />
      <v-select
        v-model="granularity"
        :items="granularityOptions"
        :label="t('admin.stats.granularity')"
        density="compact"
        hide-details
        :style="isMobile ? 'flex: 1 1 45%' : 'max-width: 170px'"
        @update:model-value="load"
      />
      <v-btn variant="tonal" prepend-icon="mdi-refresh" :loading="loading" @click="load">{{ t('admin.stats.refresh') }}</v-btn>
    </div>

    <v-alert v-if="failed" type="warning" variant="tonal" class="mb-4">{{ t('admin.stats.partialError') }}</v-alert>

    <v-row dense>
      <v-col cols="6" md="3"><KpiCard :label="t('admin.stats.mau')" :value="data.activity?.mau ?? '—'" icon="mdi-account-clock-outline" tone="primary" /></v-col>
      <v-col cols="6" md="3"><KpiCard :label="t('admin.stats.wau')" :value="data.activity?.wau ?? '—'" icon="mdi-calendar-week" tone="income" /></v-col>
      <v-col cols="6" md="3"><KpiCard :label="t('admin.stats.dau')" :value="data.activity?.dau ?? '—'" icon="mdi-calendar-today" tone="gold" /></v-col>
      <v-col cols="6" md="3"><KpiCard :label="t('admin.stats.stickiness')" :value="data.activity ? `${data.activity.stickiness}%` : '—'" icon="mdi-magnet" tone="expense" /></v-col>
    </v-row>

    <v-row class="mt-1">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-body-1 font-weight-bold">{{ t('admin.stats.growth') }}</v-card-title>
          <v-card-text>
            <div v-if="growthData" class="chart-box"><Line :data="growthData" :options="lineOptions" /></div>
            <EmptyHint v-if="!data.growth?.series?.length" :text="t('admin.stats.noData')" />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-body-1 font-weight-bold">{{ t('admin.stats.activeUsers') }}</v-card-title>
          <v-card-text>
            <div v-if="activityData" class="chart-box"><Bar :data="activityData" :options="barOptions" /></div>
            <EmptyHint v-if="!data.activity?.series?.length" :text="t('admin.stats.noData')" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-body-1 font-weight-bold">{{ t('admin.stats.signupPlatform') }}</v-card-title>
          <v-card-subtitle class="text-wrap">{{ t('admin.stats.signupPlatformHint') }}</v-card-subtitle>
          <v-card-text><PlatformDonut :values="data.platforms?.signup" :label="platformLabel" :colors="PLATFORM_COLORS" /></v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-body-1 font-weight-bold">{{ t('admin.stats.lastPlatform') }}</v-card-title>
          <v-card-subtitle class="text-wrap">{{ t('admin.stats.lastPlatformHint') }}</v-card-subtitle>
          <v-card-text><PlatformDonut :values="data.platforms?.lastUsed" :label="platformLabel" :colors="PLATFORM_COLORS" /></v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-body-1 font-weight-bold">{{ t('admin.stats.versions') }}</v-card-title>
          <v-card-text>
            <div v-if="versionsData" class="chart-box" :style="{ height: barsHeight(data.versions.length) }"><Bar :data="versionsData" :options="horizontalOptions" /></div>
            <EmptyHint v-if="!data.versions?.length" :text="t('admin.stats.noVersions')" />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-body-1 font-weight-bold">{{ t('admin.stats.features') }}</v-card-title>
          <v-card-subtitle class="text-wrap">{{ t('admin.stats.featuresHint') }}</v-card-subtitle>
          <v-card-text>
            <div v-if="featuresData" class="chart-box" :style="{ height: barsHeight(data.features.usage.length) }"><Bar :data="featuresData" :options="horizontalOptions" /></div>
            <EmptyHint v-else :text="t('admin.stats.noData')" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="data.features">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-body-1 font-weight-bold">{{ t('admin.stats.adoption') }}</v-card-title>
          <v-card-text>
            <div v-for="item in adoptionRows" :key="item.key" class="mb-3">
              <div class="d-flex justify-space-between text-body-2"><span>{{ item.label }}</span><strong>{{ item.value }}%</strong></div>
              <v-progress-linear :model-value="item.value" color="primary" height="6" rounded :aria-label="item.label" />
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-body-1 font-weight-bold">{{ t('admin.stats.funnel') }}</v-card-title>
          <v-card-text v-if="data.funnel">
            <div class="funnel-row"><span>{{ t('admin.stats.funnelVerified') }}</span><strong>{{ data.funnel.verified }}</strong></div>
            <div class="funnel-row"><span>{{ t('admin.stats.funnelFirstTx') }}</span><strong>{{ data.funnel.firstTransaction }} ({{ data.funnel.activationRate }}%)</strong></div>
            <div class="funnel-row"><span>{{ t('admin.stats.funnelPending') }}</span><strong>{{ data.funnel.pendingNow }}</strong></div>
            <div class="text-caption text-medium-emphasis mt-2">{{ t('admin.stats.funnelHint') }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="mt-4" v-if="data.retention">
      <v-card-title class="text-body-1 font-weight-bold">{{ t('admin.stats.retention') }}</v-card-title>
      <v-card-subtitle class="text-wrap">{{ t('admin.stats.retentionHint') }}</v-card-subtitle>
      <v-card-text>
        <v-table density="compact" class="retention-table">
          <thead>
            <tr>
              <th>{{ t(isMobile ? 'admin.stats.cohortShort' : 'admin.stats.cohort') }}</th>
              <th class="text-right">{{ t('admin.stats.cohortSize') }}</th>
              <th class="text-right">{{ t(isMobile ? 'admin.stats.week1Short' : 'admin.stats.week1') }}</th>
              <th class="text-right">{{ t(isMobile ? 'admin.stats.week2Short' : 'admin.stats.week2') }}</th>
              <th class="text-right">{{ t(isMobile ? 'admin.stats.week4Short' : 'admin.stats.week4') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data.retention.cohorts" :key="row.cohort">
              <td>{{ periodLabel(row.cohort, !isMobile) }}</td>
              <td class="text-right">{{ row.size }}</td>
              <td v-for="key in ['week1', 'week2', 'week4']" :key="key" class="text-right">
                <span v-if="row[key] === null" class="text-medium-emphasis">—</span>
                <span v-else class="heat" :style="{ '--heat': row[key] / 100 }">{{ row[key] }}%</span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <v-row class="mt-1">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-body-1 font-weight-bold">{{ t('admin.stats.splits') }}</v-card-title>
          <v-card-text v-if="data.splits">
            <div class="funnel-row"><span>{{ t('admin.stats.splitsAcceptance') }}</span><strong>{{ data.splits.acceptanceRate }}%</strong></div>
            <div class="funnel-row"><span>{{ t('admin.stats.splitsPaid') }}</span><strong>{{ data.splits.paidRate }}%</strong></div>
            <div v-for="(count, status) in data.splits.participantsByStatus" :key="status" class="funnel-row">
              <span>{{ t(`splits.status.${status}`) }}</span><strong>{{ count }}</strong>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col v-if="isAdmin" cols="12" md="6">
        <v-card>
          <v-card-title class="text-body-1 font-weight-bold">{{ t('admin.stats.revenue') }}</v-card-title>
          <v-card-text v-if="data.revenue">
            <div v-if="revenueData" class="chart-box"><Bar :data="revenueData" :options="barOptions" /></div>
            <div class="funnel-row mt-2"><span>{{ t('admin.stats.mrr') }}</span><strong>{{ mrrLabel }}</strong></div>
            <div class="funnel-row"><span>{{ t('admin.stats.payingUsers') }}</span><strong>{{ data.revenue.payingUsers }} ({{ data.revenue.conversionRate }}%)</strong></div>
            <div class="funnel-row"><span>{{ t('admin.stats.canceled') }}</span><strong>{{ data.revenue.canceled }}</strong></div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { Line, Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS, LineElement, PointElement, BarElement, ArcElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler,
} from 'chart.js'
import { adminAPI } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useLocale } from '@/composables/useLocale'
import KpiCard from '@/components/finance/KpiCard.vue'

ChartJS.register(LineElement, PointElement, BarElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend, Filler)

const { t } = useI18n()
const { money, locale } = useLocale()

// The API names periods as 2026-11-13 (day or week start) or 2026-11 (month). Shown the way
// the rest of the app writes dates.
const periodLabel = (period, withYear = false) => {
  const text = String(period ?? '')
  const day = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const month = text.match(/^(\d{4})-(\d{2})$/)
  if (!day && !month) return text
  const [, y, m, d] = day || [...month, '01']
  const value = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  const options = day
    ? { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' }
    : { month: 'short', year: 'numeric', timeZone: 'UTC' }
  return new Intl.DateTimeFormat(locale.value, options).format(value)
}

// Horizontal bar charts grow with their rows, so one row is not a wall of color.
const barsHeight = (rows) => `${Math.min(240, Math.max(96, rows * 34 + 40))}px`
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const isAdmin = computed(() => useAuthStore().isAdmin)

// Same hues as the rest of the app (teal, gold, sky); grey only for "no data".
const PLATFORM_COLORS = { android: '#3DDC84', ios: '#5CC8FF', pwa: '#F4B860', web: '#22D3C5', unknown: '#5b6270' }
const platformLabel = (key) => t(`admin.stats.platform.${key}`)

const EmptyHint = (props) => h('div', { class: 'text-center text-caption text-medium-emphasis py-2' }, props.text)
EmptyHint.props = ['text']

// Dona con la leyenda al lado; sin datos muestra el aviso en lugar de un círculo vacío.
const PlatformDonut = {
  props: ['values', 'label', 'colors'],
  setup(props) {
    const entries = computed(() => Object.entries(props.values || {}).filter(([, n]) => n > 0))
    const total = computed(() => entries.value.reduce((sum, [, n]) => sum + n, 0))
    const chart = computed(() => ({
      labels: entries.value.map(([key]) => props.label(key)),
      datasets: [{ data: entries.value.map(([, n]) => n), backgroundColor: entries.value.map(([key]) => props.colors[key]), borderWidth: 0 }],
    }))
    return () => (!entries.value.length
      ? h(EmptyHint, { text: t('admin.stats.noData') })
      : h('div', { class: 'platform-donut' }, [
        h('div', { class: 'platform-donut__chart' }, h(Doughnut, { data: chart.value, options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } } })),
        h('div', { class: 'platform-donut__legend' }, entries.value.map(([key, n]) => h('div', { class: 'platform-donut__row', key }, [
          h('span', { class: 'platform-donut__dot', style: { background: props.colors[key] } }),
          h('span', { class: 'platform-donut__name' }, props.label(key)),
          h('strong', `${n} · ${Math.round((n / total.value) * 100)}%`),
        ]))),
      ]))
  },
}

const rangeDays = ref(90)
const granularity = ref('day')
const loading = ref(false)
const failed = ref(false)
const data = ref({})

const rangeOptions = computed(() => [
  { title: t('admin.stats.days', { n: 30 }), value: 30 },
  { title: t('admin.stats.days', { n: 90 }), value: 90 },
  { title: t('admin.stats.days', { n: 180 }), value: 180 },
  { title: t('admin.stats.months12'), value: 365 },
])
const granularityOptions = computed(() => [
  { title: t('admin.stats.day'), value: 'day' },
  { title: t('admin.stats.week'), value: 'week' },
  { title: t('admin.stats.month'), value: 'month' },
])

const load = async () => {
  loading.value = true
  failed.value = false
  const to = new Date()
  const from = new Date(to.getTime() - rangeDays.value * 86_400_000)
  const params = { from: from.toISOString(), to: to.toISOString(), granularity: granularity.value }
  const names = ['growth', 'activity', 'platforms', 'versions', 'retention', 'features', 'funnel', 'splits', ...(isAdmin.value ? ['revenue'] : [])]
  const results = await Promise.allSettled(names.map((name) => adminAPI.getStats(name, params)))
  const next = {}
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') next[names[index]] = result.value.data
    else failed.value = true
  })
  data.value = next
  loading.value = false
}
onMounted(load)

const axisColor = 'rgba(128, 138, 150, 0.9)'
const gridColor = 'rgba(128, 138, 150, 0.15)'
const baseScales = {
  x: { ticks: { color: axisColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
  y: { beginAtZero: true, ticks: { color: axisColor, precision: 0 }, grid: { color: gridColor } },
}
const lineOptions = { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: baseScales, plugins: { legend: { labels: { color: axisColor, boxWidth: 12 } } } }
const barOptions = { responsive: true, maintainAspectRatio: false, scales: baseScales, plugins: { legend: { display: false } } }
const horizontalOptions = {
  indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
  scales: { x: baseScales.y, y: { ticks: { color: axisColor }, grid: { display: false } } },
}

const growthData = computed(() => {
  const series = data.value.growth?.series
  if (!series?.length) return null
  return {
    labels: series.map((r) => periodLabel(r.period)),
    datasets: [
      { label: t('admin.stats.signups'), data: series.map((r) => r.signups), borderColor: '#22D3C5', backgroundColor: 'rgba(34, 211, 197, 0.15)', fill: true, tension: 0.3, pointRadius: 2 },
      { label: t('admin.stats.cumulative'), data: series.map((r) => r.total), borderColor: '#D5A94E', tension: 0.3, pointRadius: 0, borderDash: [6, 4] },
    ],
  }
})
const activityData = computed(() => {
  const series = data.value.activity?.series
  if (!series?.length) return null
  return { labels: series.map((r) => periodLabel(r.period)), datasets: [{ data: series.map((r) => r.activeUsers), backgroundColor: '#22D3C5', borderRadius: 4, maxBarThickness: 36 }] }
})
const versionsData = computed(() => {
  const rows = data.value.versions
  if (!rows?.length) return null
  return {
    labels: rows.map((r) => `${platformLabel(r.platform)} ${r.version}`),
    datasets: [{ data: rows.map((r) => r.users), backgroundColor: rows.map((r) => PLATFORM_COLORS[r.platform] || PLATFORM_COLORS.unknown), borderRadius: 4, maxBarThickness: 22 }],
  }
})
const featuresData = computed(() => {
  const rows = data.value.features?.usage
  if (!rows?.length) return null
  return {
    labels: rows.map((r) => t(`admin.stats.feature.${r.feature}`)),
    datasets: [{ data: rows.map((r) => r.users), backgroundColor: '#5CC8FF', borderRadius: 4, maxBarThickness: 22 }],
  }
})
const adoptionRows = computed(() => {
  const adoption = data.value.features?.adoption
  if (!adoption) return []
  return ['twoFactor', 'whatsapp', 'passkeys', 'push'].map((key) => ({ key, label: t(`admin.stats.adoptionKeys.${key}`), value: adoption[key] }))
})
const revenueData = computed(() => {
  const series = data.value.revenue?.series
  if (!series?.length) return null
  return { labels: series.map((r) => `${periodLabel(r.period)} ${r.currency}`), datasets: [{ data: series.map((r) => r.amount), backgroundColor: '#D5A94E', borderRadius: 4, maxBarThickness: 36 }] }
})
const mrrLabel = computed(() => {
  const mrr = data.value.revenue?.mrr || {}
  const entries = Object.entries(mrr)
  return entries.length ? entries.map(([currency, amount]) => money(amount, currency)).join(' · ') : '—'
})
</script>

<style scoped>
.chart-box { position: relative; height: 240px; }
/* Cards of the same row end at the same height. */
[class*="v-col-"] > .v-card { height: 100%; }

/* Retention on phones: the signup week stays in view while the weeks scroll under it, and a
   fade on the right shows there is more. */
.retention-table :deep(th), .retention-table :deep(td) { white-space: nowrap; }
@media (max-width: 599px) {
  .retention-table :deep(th), .retention-table :deep(td) { padding: 0 8px !important; font-size: 0.8rem; }
  .retention-table :deep(th:first-child), .retention-table :deep(td:first-child) {
    position: sticky;
    left: 0;
    z-index: 1;
    background: var(--kf-surface-elevated, #0d3440);
  }
  .retention-table :deep(.v-table__wrapper) {
    -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent);
    mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent);
  }
  .heat { min-width: 40px; padding: 2px 6px; }
}
.funnel-row { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid rgba(128, 138, 150, 0.15); font-size: 0.9rem; }
.heat { display: inline-block; min-width: 52px; padding: 2px 8px; border-radius: 6px; background: rgba(34, 211, 197, calc(var(--heat) * 0.55 + 0.05)); }
:deep(.platform-donut) { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
:deep(.platform-donut__chart) { position: relative; width: 140px; height: 140px; flex: 0 0 auto; }
:deep(.platform-donut__legend) { flex: 1 1 140px; display: grid; gap: 8px; }
:deep(.platform-donut__row) { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
:deep(.platform-donut__name) { flex: 1; }
:deep(.platform-donut__dot) { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }
</style>
