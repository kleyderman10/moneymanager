<template>
  <div>
    <div class="page-intro d-flex align-start align-sm-center flex-column flex-sm-row ga-3">
      <div>
        <div class="page-intro__eyebrow">{{ t('goals.yourFuture') }}</div>
        <h1 :class="isMobile ? 'text-h5' : 'text-h4'">{{ t('nav.goals') }}</h1>
        <p class="page-intro__subtitle">{{ t('goals.subtitle') }}</p>
      </div>
      <v-spacer />
      <v-btn v-if="!isMobile && !billingStore.isReadOnly" color="primary" prepend-icon="mdi-plus" @click="openCreate">{{ t('goals.newGoal') }}</v-btn>
    </div>

    <v-card v-if="store.goals.length === 0" class="pa-8 text-center text-grey">
      <v-icon size="x-large" color="grey">mdi-target</v-icon>
      <div class="mt-2">{{ t('goals.noGoals') }}</div>
      <v-btn v-if="!billingStore.isReadOnly" color="primary" variant="text" class="mt-2" @click="openCreate">{{ t('goals.createFirstGoal') }}</v-btn>
    </v-card>

    <v-row v-else>
      <v-col v-for="goal in store.goals" :key="goal._id" cols="12" sm="6" md="4">
        <v-card>
          <v-card-title :class="isMobile ? 'text-body-1' : undefined">{{ goal.name }}</v-card-title>
          <v-card-text>
            <div class="d-flex justify-space-between mb-1">
              <span>{{ money(goal.currentAmount) }}</span>
              <span class="text-grey">{{ money(goal.targetAmount) }}</span>
            </div>
            <v-progress-linear :model-value="goal.percentage" :color="goal.percentage >= 100 ? 'success' : 'primary'" height="20" rounded>
              <template #default><span class="text-white text-caption">{{ Math.min(goal.percentage, 100) }}%</span></template>
            </v-progress-linear>
            <div class="mt-1 d-flex justify-space-between text-caption">
              <span>{{ goal.deadline ? t('goals.until', { date: formatDate(goal.deadline) }) : t('goals.noDeadline') }}</span>
              <span>{{ t('goals.remaining', { amount: money(goal.remaining) }) }}</span>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn v-if="!billingStore.isReadOnly" size="small" variant="text" color="success" prepend-icon="mdi-plus" @click="openProgress(goal)">{{ t('common.add') }}</v-btn>
            <v-spacer />
            <v-btn v-if="!billingStore.isReadOnly" size="small" variant="text" icon="mdi-pencil" @click="openEdit(goal)" />
            <v-btn v-if="!billingStore.isReadOnly" size="small" variant="text" icon="mdi-delete" color="error" @click="confirmDelete(goal)" />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

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

    <v-btn v-if="isMobile && !billingStore.isReadOnly" icon="mdi-plus" color="primary" size="x-large" class="finance-fab" @click="openCreate" />
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
