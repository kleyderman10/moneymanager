<template>
  <div>
    <div class="page-intro d-flex align-start align-sm-center flex-column flex-sm-row ga-3">
      <div>
        <div class="page-intro__eyebrow">Plan mensual</div>
        <h1 :class="isMobile ? 'text-h5' : 'text-h4'">Presupuestos</h1>
        <p class="page-intro__subtitle">Define límites realistas y mantén tus gastos dentro del plan.</p>
      </div>
      <v-spacer />
      <v-btn v-if="!isMobile && !billingStore.isReadOnly" color="primary" prepend-icon="mdi-plus" @click="openCreate">Nuevo presupuesto</v-btn>
    </div>

    <v-card v-if="!isMobile">
      <v-data-table :items="store.budgets" :headers="headers" :loading="store.loading" hover>
        <template #item.month="{ value }">{{ months[value - 1] }}</template>
        <template #item.category="{ value }">
          <span v-if="value">{{ value.icon }} {{ value.name }}</span>
          <v-chip v-else size="small">General</v-chip>
        </template>
        <template #item.amount="{ value }">${{ fmt(value) }}</template>
        <template #item.actions="{ item }">
          <v-icon v-if="!billingStore.isReadOnly" size="small" class="mr-2" @click="openEdit(item)">mdi-pencil</v-icon>
          <v-icon v-if="!billingStore.isReadOnly" size="small" color="error" @click="confirmDelete(item)">mdi-delete</v-icon>
        </template>
      </v-data-table>
    </v-card>

    <div v-else>
      <v-card v-if="store.budgets.length === 0 && !store.loading" class="pa-8 text-center text-grey">
        <v-icon size="x-large" color="grey">mdi-chart-pie</v-icon>
        <div class="mt-2">No hay presupuestos</div>
      </v-card>
      <v-row v-else>
        <v-col v-for="b in store.budgets" :key="b._id" cols="12" sm="6">
          <v-card @click="!billingStore.isReadOnly && openEdit(b)">
            <v-card-title class="text-body-1">
              {{ b.category?.icon }} {{ b.category?.name || 'General' }}
            </v-card-title>
            <v-card-text>
              <div class="text-h6">${{ fmt(b.amount) }}</div>
              <div class="text-caption text-grey">{{ months[b.month - 1] }} {{ b.year }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <v-dialog v-model="dialog" :fullscreen="isMobile" max-width="400">
      <v-card :title="editing ? 'Editar' : 'Nuevo presupuesto'">
        <v-card-text>
          <NativeSelectField v-model="form.month" :items="monthOptions" label="Mes" required />
          <v-text-field v-model.number="form.year" label="Año" type="number" density="compact" required />
          <v-text-field v-model.number="form.amount" label="Monto límite" type="number" density="compact" required />
          <NativeSelectField v-model="form.category" :items="categories" item-title="name" item-value="_id" label="Categoría (opcional)" placeholder="General" />
          <div class="d-flex align-center mt-1">
            <AIRecommendBudget :category-id="form.category" @predicted="onBudgetPredicted" />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="save">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>Confirmar</v-card-title>
        <v-card-text>¿Eliminar este presupuesto?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" @click="doDelete">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-btn
      v-if="isMobile && !billingStore.isReadOnly"
      icon="mdi-plus"
      color="primary"
      size="x-large"
      class="finance-fab"
      @click="openCreate"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useBudgetsStore } from '@/stores/budgets'
import { useSnackbar } from '@/stores/snackbar'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { categoriesAPI } from '@/api'
import AIRecommendBudget from '@/components/AIRecommendBudget.vue'
import NativeSelectField from '@/components/NativeSelectField.vue'

const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)

const store = useBudgetsStore()
const snackbar = useSnackbar()
const billingStore = useSubscriptionStore()
const categories = ref([])
const dialog = ref(false)
const deleteDialog = ref(false)
const editing = ref(null)
const toDelete = ref(null)

const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const monthOptions = months.map((m, i) => ({ title: m, value: i + 1 }))
const now = new Date()
const form = ref({ month: now.getMonth() + 1, year: now.getFullYear(), amount: 0, category: null })

const headers = [
  { title: 'Mes', key: 'month' }, { title: 'Año', key: 'year' },
  { title: 'Categoría', key: 'category' }, { title: 'Monto', key: 'amount' },
  { title: '', key: 'actions', sortable: false, width: 80 },
]

const fmt = (n) => Number(n).toLocaleString('es-CO')

const openCreate = () => { editing.value = null; form.value = { month: now.getMonth() + 1, year: now.getFullYear(), amount: 0, category: null }; dialog.value = true }
const openEdit = (item) => { editing.value = item._id; form.value = { month: item.month, year: item.year, amount: item.amount, category: item.category?._id || null }; dialog.value = true }

const save = async () => {
  try {
    if (editing.value) { await store.update(editing.value, { amount: form.value.amount }); snackbar.success('Actualizado') }
    else { await store.upsert(form.value); snackbar.success('Presupuesto creado') }
    dialog.value = false
  } catch { snackbar.error('Error') }
}

const confirmDelete = (item) => { toDelete.value = item._id; deleteDialog.value = true }

const onBudgetPredicted = (data) => {
  if (data.recommendedBudget) form.value.amount = data.recommendedBudget
  snackbar.info(`AI recomienda: $${data.recommendedBudget} - ${data.reasoning}`)
}
const doDelete = async () => { try { await store.remove(toDelete.value); snackbar.success('Eliminado') } catch { snackbar.error('Error') }; deleteDialog.value = false }

onMounted(async () => { store.fetchAll(); const res = await categoriesAPI.getAll(); categories.value = res.data })
</script>
