<template>
  <div>
    <div class="page-intro">
      <div class="page-intro__eyebrow">Análisis financiero</div>
      <h1 :class="isMobile ? 'text-h5' : 'text-h4'">Reportes</h1>
      <p class="page-intro__subtitle">Descubre tendencias, compara periodos y entiende cómo evoluciona tu dinero.</p>
    </div>

    <v-tabs v-model="tab" color="primary" class="mb-2">
      <v-tab value="monthly">Mensual</v-tab>
      <v-tab value="yearly">Anual</v-tab>
      <v-tab value="ai">Análisis inteligente</v-tab>
    </v-tabs>

    <v-card v-if="tab === 'monthly'">
      <v-card-text class="pa-2 pa-md-4">
        <v-row dense>
          <v-col cols="6" sm="5">
            <v-select v-model="monthlyMonth" :items="monthOptions" label="Mes" density="compact" hide-details @update:model-value="loadMonthly" />
          </v-col>
          <v-col cols="6" sm="5">
            <v-text-field v-model="monthlyYear" label="Año" type="number" density="compact" hide-details @update:model-value="loadMonthly" />
          </v-col>
        </v-row>

        <template v-if="monthlyReport">
          <v-row class="mt-2">
            <v-col cols="6" sm="3">
              <v-card variant="tonal" color="income">
                <v-card-text class="text-center pa-2 pa-md-4">
                  <div class="text-caption">Ingresos</div>
                  <div :class="isMobile ? 'text-body-1' : 'text-h5'">${{ fmt(monthlyReport.summary?.totalIncome) }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="6" sm="3">
              <v-card variant="tonal" color="expense">
                <v-card-text class="text-center pa-2 pa-md-4">
                  <div class="text-caption">Gastos</div>
                  <div :class="isMobile ? 'text-body-1' : 'text-h5'">${{ fmt(monthlyReport.summary?.totalExpenses) }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="6" sm="3">
              <v-card variant="tonal" :color="monthlyReport.summary?.balance >= 0 ? 'blue' : 'red'">
                <v-card-text class="text-center pa-2 pa-md-4">
                  <div class="text-caption">Balance</div>
                  <div :class="isMobile ? 'text-body-1' : 'text-h5'">${{ fmt(Math.abs(monthlyReport.summary?.balance || 0)) }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="6" sm="3">
              <v-card variant="tonal" color="grey">
                <v-card-text class="text-center pa-2 pa-md-4">
                  <div class="text-caption">vs Mes anterior</div>
                  <div :class="isMobile ? 'text-body-1' : 'text-h5'">
                    <span :class="monthlyReport.expenseChange > 0 ? 'text-red' : 'text-green'">
                      {{ monthlyReport.expenseChange !== null ? (monthlyReport.expenseChange > 0 ? '+' : '') + monthlyReport.expenseChange + '%' : 'N/A' }}
                    </span>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <h3 class="mt-4 mb-1">Presupuestos</h3>
          <v-row v-if="monthlyReport.budgetStatus?.length">
            <v-col v-for="bs in monthlyReport.budgetStatus" :key="bs.budget._id" cols="12" sm="6" md="4">
              <v-card :color="bs.exceeded ? 'error' : 'success'" theme="dark">
                <v-card-title class="text-body-2">{{ bs.budget.category?.name || 'General' }}</v-card-title>
                <v-card-text class="pa-2">
                  <v-progress-linear :model-value="Math.min(bs.percentage, 100)" height="14" rounded color="white" />
                  <div class="d-flex justify-space-between mt-1 text-caption">
                    <span>${{ fmt(bs.spent) }} / ${{ fmt(bs.budget.amount) }}</span>
                    <span>{{ Math.min(bs.percentage, 100) }}%</span>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
          <v-alert v-else type="info" density="compact" class="mt-2">No hay presupuestos para este mes</v-alert>
        </template>
      </v-card-text>
    </v-card>

    <v-card v-if="tab === 'yearly'">
      <v-card-text class="pa-2 pa-md-4">
        <v-row dense>
          <v-col cols="8">
            <v-text-field v-model="yearlyYear" label="Año" type="number" density="compact" hide-details @update:model-value="loadYearly" />
          </v-col>
          <v-col cols="4" class="d-flex align-center">
            <v-btn color="primary" @click="loadYearly" block size="small">Ver</v-btn>
          </v-col>
        </v-row>

        <v-table v-if="yearlyReport" class="mt-2" density="compact">
          <thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Balance</th></tr></thead>
          <tbody>
            <tr v-for="m in yearlyReport.months" :key="m.month">
              <td>{{ monthNames[m.month - 1] }}</td>
              <td class="text-green">${{ fmt(m.totalIncome) }}</td>
              <td class="text-red">${{ fmt(m.totalExpenses) }}</td>
              <td :class="m.balance >= 0 ? 'text-green' : 'text-red'">${{ fmt(Math.abs(m.balance)) }}</td>
            </tr>
          </tbody>
        </v-table>
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
            Generar análisis con AI
          </v-btn>
          <div class="text-caption text-grey mt-1">La AI analizará tus datos financieros</div>
        </div>

        <template v-if="analysis">
          <v-alert type="info" variant="tonal" class="mb-2">
            {{ analysis.overview }}
          </v-alert>

          <v-card v-if="analysis.healthScore" class="mb-3">
            <v-card-title class="text-body-1">Score de Salud Financiera</v-card-title>
            <v-card-text>
              <AIHealthScore :score="analysis.healthScore" />
            </v-card-text>
          </v-card>

          <h3 class="text-h6 mb-2">Patrones de gasto</h3>
          <v-row v-if="analysis.spendingPatterns?.length">
            <v-col v-for="p in analysis.spendingPatterns" :key="p.category" cols="12" sm="6" md="4">
              <v-card variant="tonal" :color="p.trend === 'up' ? 'error' : p.trend === 'down' ? 'success' : 'info'">
                <v-card-text>
                  <div class="text-body-2">{{ p.category }}</div>
                  <div class="text-h6">{{ p.trend === 'up' ? '↑' : p.trend === 'down' ? '↓' : '→' }} {{ p.percentage }}%</div>
                  <div class="text-caption">{{ p.description }}</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <h3 v-if="analysis.anomalies?.length" class="text-h6 mb-2 mt-3">Anomalías detectadas</h3>
          <v-alert v-for="(a, i) in analysis.anomalies" :key="i" :type="a.severity === 'high' ? 'error' : 'warning'" variant="tonal" density="compact" class="mb-1">
            {{ a.description }}
          </v-alert>

          <h3 v-if="analysis.recommendations?.length" class="text-h6 mb-2 mt-3">Recomendaciones</h3>
          <v-list density="compact" bg-color="transparent">
            <v-list-item v-for="(r, i) in analysis.recommendations" :key="i" :title="r.title" :subtitle="r.description">
              <template #append>
                <v-chip :color="r.priority === 'high' ? 'error' : r.priority === 'medium' ? 'warning' : 'info'" size="x-small">
                  Ahorro: ${{ fmt(r.potentialSaving || 0) }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>

          <h3 v-if="analysis.goalPredictions?.length" class="text-h6 mb-2 mt-3">Predicción de metas</h3>
          <v-row>
            <v-col v-for="g in analysis.goalPredictions" :key="g.name" cols="12" sm="6">
              <v-card variant="tonal" :color="g.onTrack ? 'success' : 'warning'">
                <v-card-text>
                  <div class="text-body-2">{{ g.name }}</div>
                  <div class="text-caption">${{ fmt(g.current) }} / ${{ fmt(g.target) }}</div>
                  <div class="text-caption">{{ g.onTrack ? 'En camino' : 'Retrasada' }} · Est: {{ g.estimatedCompletion }}</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <h3 v-if="analysis.projections" class="text-h6 mb-2 mt-3">Proyección próximo mes</h3>
          <v-row>
            <v-col cols="6">
              <v-card variant="tonal" color="income"><v-card-text class="text-center"><div class="text-caption">Ingresos est.</div><div class="text-h6">${{ fmt(analysis.projections.nextMonthIncome) }}</div></v-card-text></v-card>
            </v-col>
            <v-col cols="6">
              <v-card variant="tonal" color="expense"><v-card-text class="text-center"><div class="text-caption">Gastos est.</div><div class="text-h6">${{ fmt(analysis.projections.nextMonthExpenses) }}</div></v-card-text></v-card>
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
import { reportsAPI, aiAPI } from '@/api'
import { useSubscriptionStore } from '@/stores/subscriptions'
import AIHealthScore from '@/components/AIHealthScore.vue'

const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const billingStore = useSubscriptionStore()
const tab = ref('monthly')
const now = new Date()

const monthlyMonth = ref(now.getMonth() + 1)
const monthlyYear = ref(now.getFullYear())
const yearlyYear = ref(now.getFullYear())
const monthlyReport = ref(null)
const yearlyReport = ref(null)
const analysis = ref(null)
const analysisLoading = ref(false)

const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const monthOptions = monthNames.map((m, i) => ({ title: m, value: i + 1 }))
const fmt = (n) => Number(n || 0).toLocaleString('es-CO')

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
