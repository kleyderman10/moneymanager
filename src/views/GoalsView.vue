<template>
  <div>
    <div data-tour="page-intro" class="page-intro d-flex align-start align-sm-center flex-column flex-sm-row ga-3">
      <div>
        <div class="page-intro__eyebrow">{{ t('goals.yourFuture') }}</div>
        <h1 :class="isMobile ? 'text-h5' : 'text-h4'">{{ t('nav.goals') }}</h1>
        <p class="page-intro__subtitle">{{ t('goals.subtitle') }}</p>
      </div>
      <v-spacer />
      <v-btn v-if="!isMobile && !billingStore.isReadOnly" data-tour="page-add" color="primary" prepend-icon="mdi-plus" @click="openCreate">{{ t('goals.newGoal') }}</v-btn>
    </div>

    <v-card v-if="store.goals.length === 0" class="pa-8 text-center text-grey">
      <v-icon size="x-large" color="grey">mdi-target</v-icon>
      <div class="mt-2">{{ t('goals.noGoals') }}</div>
      <v-btn v-if="!billingStore.isReadOnly" color="primary" variant="text" class="mt-2" @click="openCreate">{{ t('goals.createFirstGoal') }}</v-btn>
    </v-card>

    <template v-else>
      <button v-if="!billingStore.isReadOnly" type="button" class="goals-add mb-4" @click="openCreate">
        <v-icon>mdi-plus</v-icon>
        <span>{{ t('goals.addNewGoal') }}</span>
        <v-icon class="ml-auto" size="20">mdi-chevron-right</v-icon>
      </button>

      <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-3">
        <h2 class="text-h6 font-weight-bold">{{ t('goals.myGoals') }}</h2>
        <KfSegmented v-model="statusFilter" :options="statusOptions" :label="t('goals.myGoals')" :block="isMobile" />
      </div>

      <v-row dense>
        <v-col v-for="goal in visibleGoals" :key="goal._id" cols="12" sm="6" lg="4">
          <v-card class="goal-card h-100" :class="{ 'goal-card--done': goal.percentage >= 100 }">
            <v-card-text class="goal-card__body">
              <div class="goal-card__head">
                <span class="kf-icon-tile kf-icon-tile--lg" :class="{ 'kf-icon-tile--gold': goal.percentage >= 100 }">
                  <v-icon size="24">{{ goalIcon(goal) }}</v-icon>
                </span>
                <div class="goal-card__title">
                  <div class="goal-card__name">{{ goal.name }}</div>
                  <div class="goal-card__date">{{ goal.deadline ? t('goals.until', { date: formatDate(goal.deadline) }) : t('goals.noDeadline') }}</div>
                </div>
                <strong class="goal-card__pct" :class="goal.percentage >= 100 ? 'kf-income' : 'text-primary'">{{ Math.min(goal.percentage, 100) }}%</strong>
              </div>

              <div class="goal-card__amounts">
                <span class="kf-amount goal-card__current">{{ money(goal.currentAmount) }}</span>
                <span class="goal-card__target">/ {{ money(goal.targetAmount) }}</span>
              </div>
              <v-progress-linear :model-value="goal.percentage" :color="goal.percentage >= 100 ? 'success' : 'primary'" height="10" rounded :aria-label="goal.name" />
              <div class="goal-card__remaining">{{ t('goals.remaining', { amount: money(Math.max(0, goal.remaining)) }) }}</div>

              <div v-if="goal.percentage >= 100" class="goal-card__celebrate" role="status">
                <v-icon color="warning" size="26">mdi-star-four-points-outline</v-icon>
                <div>
                  <strong>{{ t('goals.excellent') }}</strong>
                  <span>{{ t('goals.goalReached') }}</span>
                </div>
              </div>
            </v-card-text>
            <v-card-actions v-if="!billingStore.isReadOnly" class="goal-card__actions">
              <v-btn variant="tonal" color="primary" prepend-icon="mdi-plus" data-tour="goals-progress" @click="openProgress(goal)">{{ t('common.add') }}</v-btn>
              <v-spacer />
              <v-btn variant="text" icon="mdi-pencil-outline" size="small" :aria-label="t('common.edit')" @click="openEdit(goal)" />
              <v-btn variant="text" icon="mdi-delete-outline" size="small" :aria-label="t('common.delete')" color="error" @click="confirmDelete(goal)" />
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <v-dialog v-model="dialog" :fullscreen="isMobile" max-width="400">
      <v-card :title="editing ? t('goals.editGoal') : t('goals.newGoal')" class="capture-form">
        <v-card-text>
          <v-text-field v-model="form.name" :label="t('profile.name')" variant="outlined" density="compact" required class="mb-3" />
          <MoneyField v-model="form.targetAmount" :label="t('goals.targetAmount')" size="hero" required />
          <v-text-field v-model="form.deadline" :label="t('goals.deadlineOptional')" type="date" variant="outlined" density="compact" />
        </v-card-text>
        <v-card-actions class="form-actions">
          <v-btn variant="text" @click="dialog = false">{{ t('common.cancel') }}</v-btn>
          <v-spacer />
          <v-btn class="form-actions__primary" @click="save">{{ t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="progressDialog" max-width="300">
      <v-card :title="t('goals.addProgress')" class="capture-form">
        <v-card-text><MoneyField v-model="progressAmount" :label="t('wallets.amount')" size="hero" required /></v-card-text>
        <v-card-actions class="form-actions">
          <v-btn variant="text" @click="progressDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-spacer />
          <v-btn class="form-actions__primary" @click="saveProgress">{{ t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card><v-card-title>{{ t('wallets.confirm') }}</v-card-title><v-card-text>{{ t('goals.deleteConfirm') }}</v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="deleteDialog = false">{{ t('common.cancel') }}</v-btn><v-btn color="error" @click="doDelete">{{ t('common.delete') }}</v-btn></v-card-actions></v-card>
    </v-dialog>

    <v-btn v-if="isMobile && !billingStore.isReadOnly" icon="mdi-plus" color="primary" size="x-large" class="finance-fab" :aria-label="t('goals.newGoal')" data-tour="page-add" @click="openCreate" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { useGoalsStore } from '@/stores/goals'
import { useSnackbar } from '@/stores/snackbar'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { useLocale } from '@/composables/useLocale'
import MoneyField from '@/components/MoneyField.vue'
import KfSegmented from '@/components/ui/KfSegmented.vue'
import { goalIcon } from '@/utils/categoryIcon'

const { t } = useI18n()
const { money, date } = useLocale()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const store = useGoalsStore()
const snackbar = useSnackbar()
const billingStore = useSubscriptionStore()
const dialog = ref(false)
const progressDialog = ref(false)
const deleteDialog = ref(false)
const editing = ref(null)
const toDelete = ref(null)
const progressGoal = ref(null)
const progressAmount = ref(0)
const form = ref({ name: '', targetAmount: 0, deadline: null })

const formatDate = (d) => date(d)

const statusFilter = ref('all')
const completedGoals = computed(() => store.goals.filter((g) => g.percentage >= 100))
const statusOptions = computed(() => [
  { value: 'all', label: t('goals.all'), count: store.goals.length },
  { value: 'progress', label: t('goals.inProgress'), count: store.goals.length - completedGoals.value.length },
  { value: 'done', label: t('goals.completed'), count: completedGoals.value.length },
])
const visibleGoals = computed(() => {
  if (statusFilter.value === 'done') return completedGoals.value
  if (statusFilter.value === 'progress') return store.goals.filter((g) => g.percentage < 100)
  return store.goals
})

const openCreate = () => { editing.value = null; form.value = { name: '', targetAmount: 0, deadline: null }; dialog.value = true }
const openEdit = (g) => { editing.value = g._id; form.value = { name: g.name, targetAmount: g.targetAmount, deadline: g.deadline ? new Date(g.deadline).toISOString().slice(0, 10) : null }; dialog.value = true }

const save = async () => {
  try {
    if (editing.value) { await store.update(editing.value, form.value); snackbar.success(t('goals.goalUpdated')) }
    else { await store.create(form.value); snackbar.success(t('goals.goalCreated')) }
    dialog.value = false
  } catch { snackbar.error(t('common.error')) }
}

const openProgress = (g) => { progressGoal.value = g._id; progressAmount.value = 0; progressDialog.value = true }
const saveProgress = async () => { try { await store.addProgress(progressGoal.value, { amount: progressAmount.value }); snackbar.success(t('goals.progressAdded')); progressDialog.value = false } catch { snackbar.error(t('common.error')) } }
const confirmDelete = (g) => { toDelete.value = g._id; deleteDialog.value = true }
const doDelete = async () => { try { await store.remove(toDelete.value); snackbar.success(t('goals.goalDeleted')) } catch { snackbar.error(t('common.error')) }; deleteDialog.value = false }

onMounted(() => store.fetchAll())
</script>

<style scoped>
.goals-add {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 56px;
  padding: 0 18px;
  border: 1px dashed var(--kf-border);
  border-radius: var(--kf-radius);
  background: rgba(0, 229, 208, 0.04);
  color: var(--kf-primary);
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  transition: background var(--kf-motion) var(--kf-ease);
}

.goals-add:hover {
  background: var(--kf-tint-primary);
}

.goal-card__body {
  padding: 18px !important;
}

.goal-card__head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.goal-card__title {
  flex: 1 1 auto;
  min-width: 0;
}

.goal-card__name {
  overflow: hidden;
  font-size: 1.04rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goal-card__date {
  color: var(--kf-text-secondary);
  font-size: 0.78rem;
}

.goal-card__pct {
  font-size: 1.1rem;
}

.goal-card__amounts {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 10px;
}

.goal-card__current {
  font-size: 1.4rem;
}

.goal-card__target {
  color: var(--kf-text-secondary);
  font-size: 0.88rem;
}

.goal-card__remaining {
  margin-top: 8px;
  color: var(--kf-text-secondary);
  font-size: 0.8rem;
}

.goal-card--done {
  border-color: rgba(40, 217, 165, 0.35) !important;
}

/* Quiet celebration when a goal reaches 100%. */
.goal-card__celebrate {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  padding: 12px 14px;
  border: 1px solid rgba(244, 184, 96, 0.3);
  border-radius: var(--kf-radius);
  background: linear-gradient(135deg, rgba(244, 184, 96, 0.14), rgba(0, 229, 208, 0.06));
}

.goal-card__celebrate strong,
.goal-card__celebrate span {
  display: block;
}

.goal-card__celebrate strong {
  color: var(--kf-gold-bright);
}

.goal-card__celebrate span {
  color: var(--kf-text-secondary);
  font-size: 0.8rem;
}

.goal-card__actions {
  padding: 0 16px 16px !important;
}
</style>
