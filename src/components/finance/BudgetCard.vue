<template>
  <v-card class="budget-card h-100">
    <v-card-text class="budget-card__body">
      <div class="budget-card__head">
        <span class="kf-icon-tile kf-icon-tile--lg"><v-icon :icon="categoryIcon(budget.category)" size="24" /></span>
        <div class="budget-card__title">
          <div class="budget-card__name">{{ budget.category?.name || t('budgets.general') }}</div>
          <div class="budget-card__period">{{ period }}</div>
        </div>
        <v-chip v-if="status" size="small" :color="color" variant="tonal" class="budget-card__pct">{{ status.percentage }}%</v-chip>
      </div>

      <div class="budget-card__amounts">
        <span class="kf-amount budget-card__spent">{{ status ? money(status.spent) : '—' }}</span>
        <span class="budget-card__limit">/ {{ money(budget.amount) }}</span>
      </div>

      <template v-if="status">
        <v-progress-linear
          :model-value="Math.min(100, status.percentage)"
          :color="color"
          height="10"
          rounded
          :aria-label="t('budgets.spent')"
        />
        <div class="budget-card__footer">
          <span>{{ t('budgets.available') }}: <strong>{{ money(status.remaining) }}</strong></span>
          <span v-if="status.exceeded" class="kf-expense">{{ t('budgets.exceeded') }}</span>
        </div>
      </template>
      <p v-else class="text-medium-emphasis mb-0">{{ t('budgets.progressUnavailable') }}</p>
    </v-card-text>

    <v-card-actions v-if="!readOnly" class="budget-card__actions">
      <v-btn prepend-icon="mdi-pencil" variant="tonal" class="budget-card__edit" @click="$emit('edit')">{{ t('common.edit') }}</v-btn>
      <v-spacer />
      <v-btn icon="mdi-delete-outline" color="error" variant="tonal" :aria-label="t('common.delete')" @click="$emit('delete')" />
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocale } from '@/composables/useLocale'
import { categoryIcon } from '@/utils/categoryIcon'
const props = defineProps({ budget: { type: Object, required: true }, status: { type: Object, default: null }, period: String, readOnly: Boolean })
defineEmits(['edit', 'delete'])
const { t } = useI18n()
const { money } = useLocale()
// Aqua while on track, gold when close to the limit, coral once exceeded.
const color = computed(() => props.status?.exceeded ? 'error' : props.status?.percentage >= 80 ? 'warning' : 'primary')
</script>

<style scoped>
.budget-card__body {
  padding: 20px !important;
}

.budget-card__head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.budget-card__title {
  flex: 1 1 auto;
  min-width: 0;
}

.budget-card__name {
  overflow: hidden;
  font-size: 1.08rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.budget-card__period {
  color: var(--kf-text-secondary);
  font-size: 0.8rem;
  text-transform: capitalize;
}

.budget-card__amounts {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 12px;
}

.budget-card__spent {
  font-size: 1.5rem;
}

.budget-card__limit {
  color: var(--kf-text-secondary);
  font-size: 0.9rem;
}

.budget-card__footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  color: var(--kf-text-secondary);
  font-size: 0.84rem;
}

.budget-card__footer strong {
  color: var(--kf-text);
}

.budget-card__actions {
  padding: 0 16px 16px !important;
}

.budget-card__edit {
  border-radius: var(--kf-radius-pill) !important;
}
</style>
