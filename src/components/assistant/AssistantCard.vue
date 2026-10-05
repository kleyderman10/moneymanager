<template>
  <div class="ac" :class="`ac--${card.kind}`">
    <!-- Period summary: totals and where the money went -->
    <template v-if="card.kind === 'summary'">
      <div class="ac__title">{{ card.title }}</div>
      <div class="ac__kpis">
        <div><span>{{ t('assistant.card.expenses') }}</span><strong class="ac__expense">{{ money(card.expenses) }}</strong></div>
        <div><span>{{ t('assistant.card.income') }}</span><strong class="ac__income">{{ money(card.income) }}</strong></div>
        <div><span>{{ t('assistant.card.balance') }}</span><strong :class="card.balance < 0 ? 'ac__expense' : 'ac__income'">{{ money(card.balance) }}</strong></div>
      </div>
      <div v-if="card.top?.length" class="ac__rows">
        <div v-for="row in card.top" :key="row.name" class="ac__row">
          <div class="ac__row-head"><span>{{ row.name }}</span><span>{{ money(row.total) }} · {{ row.percent }}%</span></div>
          <div class="ac__bar"><i :style="{ width: `${Math.min(100, row.percent)}%` }"></i></div>
        </div>
      </div>
    </template>

    <!-- One category -->
    <template v-else-if="card.kind === 'category'">
      <div class="ac__title">{{ card.title }}</div>
      <div class="ac__big">
        <span>{{ card.category }}</span>
        <strong :class="card.type === 'income' ? 'ac__income' : 'ac__expense'">{{ money(card.total) }}</strong>
      </div>
    </template>

    <!-- Account balances -->
    <template v-else-if="card.kind === 'balances'">
      <div class="ac__rows">
        <div v-for="item in card.items" :key="item.name" class="ac__row ac__row--flat">
          <div class="ac__row-head"><span>{{ item.name }}</span><strong :class="{ ac__expense: item.balance < 0 }">{{ money(item.balance) }}</strong></div>
        </div>
      </div>
      <div class="ac__total"><span>{{ t('assistant.card.total') }}</span><strong>{{ money(card.total) }}</strong></div>
    </template>

    <!-- Budgets and goals share the progress-bar layout -->
    <template v-else-if="card.kind === 'budgets'">
      <div class="ac__rows">
        <div v-for="row in card.items" :key="row.name" class="ac__row">
          <div class="ac__row-head"><span>{{ row.name }}</span><span>{{ money(row.spent) }} / {{ money(row.amount) }}</span></div>
          <div class="ac__bar" :class="barClass(row.percent)"><i :style="{ width: `${Math.min(100, row.percent)}%` }"></i></div>
          <div class="ac__pct" :class="{ ac__expense: row.percent >= 100 }">{{ row.percent }}%</div>
        </div>
      </div>
    </template>

    <template v-else-if="card.kind === 'goals'">
      <div class="ac__rows">
        <div v-for="row in card.items" :key="row.name" class="ac__row">
          <div class="ac__row-head"><span>{{ row.name }}</span><span>{{ money(row.current) }} / {{ money(row.target) }}</span></div>
          <div class="ac__bar ac__bar--goal"><i :style="{ width: `${Math.min(100, row.percent)}%` }"></i></div>
          <div class="ac__pct">{{ row.percent }}%</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useLocale } from '@/composables/useLocale'

defineProps({ card: { type: Object, required: true } })

const { t } = useI18n()
const { money } = useLocale()

// Green while there is room, gold when close, red once the budget is exceeded.
const barClass = (percent) => (percent >= 100 ? 'ac__bar--over' : percent >= 85 ? 'ac__bar--near' : '')
</script>

<style scoped>
.ac {
  align-self: flex-start;
  width: min(100%, 460px);
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(9, 53, 65, 0.6);
  border: 1px solid rgba(34, 211, 197, 0.2);
  color: var(--kf-text);
}
.ac__title { margin-bottom: 10px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.72; }
.ac__kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.ac__kpis div { display: flex; flex-direction: column; min-width: 0; }
.ac__kpis span { font-size: 0.72rem; opacity: 0.72; }
.ac__kpis strong { font-size: 0.95rem; overflow-wrap: anywhere; }
.ac__income { color: #28d9a5; }
.ac__expense { color: #ff626d; }
.ac__rows { display: grid; gap: 10px; }
.ac__row-head { display: flex; justify-content: space-between; gap: 12px; font-size: 0.9rem; }
.ac__row-head span:last-child { opacity: 0.8; white-space: nowrap; }
.ac__row--flat .ac__row-head { padding: 2px 0; }
.ac__bar { height: 8px; margin-top: 5px; border-radius: 999px; background: rgba(255, 255, 255, 0.1); overflow: hidden; }
.ac__bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #22d3c5, #3fb6ff); transition: width 600ms ease; }
.ac__bar--near i { background: linear-gradient(90deg, #f4b860, #ffd98e); }
.ac__bar--over i { background: linear-gradient(90deg, #ff626d, #ff9aa1); }
.ac__bar--goal i { background: linear-gradient(90deg, #28d9a5, #7ff0cf); }
.ac__pct { margin-top: 2px; font-size: 0.75rem; text-align: right; opacity: 0.8; }
.ac__big { display: flex; flex-direction: column; gap: 2px; }
.ac__big strong { font-size: 1.6rem; }
.ac__total { display: flex; justify-content: space-between; margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.1); }
@media (prefers-reduced-motion: reduce) { .ac__bar i { transition: none; } }
</style>
