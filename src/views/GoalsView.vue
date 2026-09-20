<template>
  <div>
    <div class="page-intro d-flex align-start align-sm-center flex-column flex-sm-row ga-3">
      <div>
        <div class="page-intro__eyebrow">Tu futuro</div>
        <h1 :class="isMobile ? 'text-h5' : 'text-h4'">Metas de ahorro</h1>
        <p class="page-intro__subtitle">Convierte tus objetivos en avances medibles y mantén la motivación.</p>
      </div>
      <v-spacer />
      <v-btn v-if="!isMobile && !billingStore.isReadOnly" color="primary" prepend-icon="mdi-plus" @click="openCreate">Nueva meta</v-btn>
    </div>

    <v-card v-if="store.goals.length === 0" class="pa-8 text-center text-grey">
      <v-icon size="x-large" color="grey">mdi-target</v-icon>
      <div class="mt-2">No hay metas de ahorro</div>
      <v-btn v-if="!billingStore.isReadOnly" color="primary" variant="text" class="mt-2" @click="openCreate">Crear primera meta</v-btn>
    </v-card>

    <v-row v-else>
      <v-col v-for="goal in store.goals" :key="goal._id" cols="12" sm="6" md="4">
        <v-card>
          <v-card-title :class="isMobile ? 'text-body-1' : undefined">{{ goal.name }}</v-card-title>
          <v-card-text>
            <div class="d-flex justify-space-between mb-1">
              <span>${{ fmt(goal.currentAmount) }}</span>
              <span class="text-grey">${{ fmt(goal.targetAmount) }}</span>
            </div>
            <v-progress-linear :model-value="goal.percentage" :color="goal.percentage >= 100 ? 'success' : 'primary'" height="20" rounded>
              <template #default><span class="text-white text-caption">{{ Math.min(goal.percentage, 100) }}%</span></template>
            </v-progress-linear>
            <div class="mt-1 d-flex justify-space-between text-caption">
              <span>{{ goal.deadline ? 'Hasta: ' + formatDate(goal.deadline) : 'Sin fecha límite' }}</span>
              <span>Falta: ${{ fmt(goal.remaining) }}</span>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn v-if="!billingStore.isReadOnly" size="small" variant="text" color="success" prepend-icon="mdi-plus" @click="openProgress(goal)">Agregar</v-btn>
            <v-spacer />
            <v-btn v-if="!billingStore.isReadOnly" size="small" variant="text" icon="mdi-pencil" @click="openEdit(goal)" />
            <v-btn v-if="!billingStore.isReadOnly" size="small" variant="text" icon="mdi-delete" color="error" @click="confirmDelete(goal)" />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" :fullscreen="isMobile" max-width="400">
      <v-card :title="editing ? 'Editar meta' : 'Nueva meta'" class="capture-form">
        <v-card-text>
          <v-text-field v-model="form.name" label="Nombre" variant="outlined" density="compact" required class="mb-3" />
          <MoneyField v-model="form.targetAmount" label="Monto objetivo" size="hero" required />
          <v-text-field v-model="form.deadline" label="Fecha límite (opcional)" type="date" variant="outlined" density="compact" />
        </v-card-text>
        <v-card-actions class="form-actions">
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-spacer />
          <v-btn class="form-actions__primary" @click="save">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="progressDialog" max-width="300">
      <v-card title="Agregar progreso" class="capture-form">
        <v-card-text><MoneyField v-model="progressAmount" label="Monto" size="hero" required /></v-card-text>
        <v-card-actions class="form-actions">
          <v-btn variant="text" @click="progressDialog = false">Cancelar</v-btn>
          <v-spacer />
          <v-btn class="form-actions__primary" @click="saveProgress">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card><v-card-title>Confirmar</v-card-title><v-card-text>¿Eliminar esta meta?</v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn><v-btn color="error" @click="doDelete">Eliminar</v-btn></v-card-actions></v-card>
    </v-dialog>

    <v-btn v-if="isMobile && !billingStore.isReadOnly" icon="mdi-plus" color="primary" size="x-large" class="finance-fab" @click="openCreate" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useGoalsStore } from '@/stores/goals'
import { useSnackbar } from '@/stores/snackbar'
import { useSubscriptionStore } from '@/stores/subscriptions'
import MoneyField from '@/components/MoneyField.vue'

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

const fmt = (n) => Number(n || 0).toLocaleString('es-CO')
const formatDate = (d) => new Date(d).toLocaleDateString('es-CO')

const openCreate = () => { editing.value = null; form.value = { name: '', targetAmount: 0, deadline: null }; dialog.value = true }
const openEdit = (g) => { editing.value = g._id; form.value = { name: g.name, targetAmount: g.targetAmount, deadline: g.deadline ? new Date(g.deadline).toISOString().slice(0, 10) : null }; dialog.value = true }

const save = async () => {
  try {
    if (editing.value) { await store.update(editing.value, form.value); snackbar.success('Meta actualizada') }
    else { await store.create(form.value); snackbar.success('Meta creada') }
    dialog.value = false
  } catch { snackbar.error('Error') }
}

const openProgress = (g) => { progressGoal.value = g._id; progressAmount.value = 0; progressDialog.value = true }
const saveProgress = async () => { try { await store.addProgress(progressGoal.value, { amount: progressAmount.value }); snackbar.success('Progreso agregado'); progressDialog.value = false } catch { snackbar.error('Error') } }
const confirmDelete = (g) => { toDelete.value = g._id; deleteDialog.value = true }
const doDelete = async () => { try { await store.remove(toDelete.value); snackbar.success('Meta eliminada') } catch { snackbar.error('Error') }; deleteDialog.value = false }

onMounted(() => store.fetchAll())
</script>
