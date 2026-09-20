<template>
  <div class="category-donut">
    <div class="category-donut__chart">
      <Doughnut :data="chartData" :options="chartOptions" />
    </div>
    <div class="category-donut__legend">
      <div v-for="row in items" :key="row.key" class="category-donut__row">
        <span class="category-donut__dot" :style="{ background: row.color }" />
        <div class="category-donut__info">
          <div class="category-donut__name">{{ row.name }}</div>
          <div class="category-donut__count">{{ row.count }} {{ row.count === 1 ? 'movimiento' : 'movimientos' }}</div>
        </div>
        <strong class="category-donut__amount">${{ row.amountLabel }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'
import { categoryMarkColor } from '@/constants/categoryColors'

ChartJS.register(ArcElement, Tooltip)

const props = defineProps({
  categories: { type: Array, default: () => [] },
})

const items = computed(() => props.categories.map((cat) => ({
  key: cat.category?._id || cat.category?.name || Math.random(),
  name: cat.category?.name || 'Sin categoría',
  count: cat.count,
  amountLabel: Number(cat.total || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 }),
  color: categoryMarkColor(cat.category),
})))

const chartData = computed(() => ({
  labels: items.value.map((row) => row.name),
  datasets: [{
    data: props.categories.map((cat) => Number(cat.total || 0)),
    backgroundColor: items.value.map((row) => row.color),
    borderWidth: 0,
    hoverOffset: 4,
  }],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.label}: $${Number(ctx.raw || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
      },
    },
  },
}
</script>

<style scoped>
.category-donut {
  display: flex;
  align-items: center;
  gap: 20px;
}

.category-donut__chart {
  position: relative;
  flex: 0 0 auto;
  width: 120px;
  height: 120px;
}

.category-donut__legend {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.category-donut__row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-donut__dot {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.category-donut__info {
  flex: 1 1 auto;
  min-width: 0;
}

.category-donut__name {
  color: var(--finance-ink);
  font-size: 0.84rem;
  font-weight: 650;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-donut__count {
  color: var(--finance-muted);
  font-size: 0.68rem;
}

.category-donut__amount {
  flex: 0 0 auto;
  color: var(--finance-expense);
  font-size: 0.86rem;
}

@media (max-width: 500px) {
  .category-donut {
    flex-direction: column;
    align-items: stretch;
  }

  .category-donut__chart {
    align-self: center;
  }
}
</style>
