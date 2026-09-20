<template>
  <div>
    <div class="page-intro d-flex align-start align-sm-center flex-column flex-sm-row ga-3">
      <div>
        <div class="page-intro__eyebrow">Organización</div>
        <h1 :class="isMobile ? 'text-h5' : 'text-h4'">Categorías</h1>
        <p class="page-intro__subtitle">Agrupa tus movimientos para entender mejor en qué entra y sale tu dinero.</p>
      </div>
      <v-spacer />
      <v-btn v-if="!isMobile && !billingStore.isReadOnly" color="primary" prepend-icon="mdi-plus" @click="openCreate">Nueva categoría</v-btn>
    </div>

    <v-tabs v-model="tab" color="primary" class="mb-2">
      <v-tab value="all">Todas</v-tab>
      <v-tab value="income">Ingresos</v-tab>
      <v-tab value="expense">Gastos</v-tab>
    </v-tabs>

    <v-card v-if="filteredCategories.length === 0" class="pa-8 text-center text-grey">
      <v-icon size="x-large" color="grey">mdi-shape-plus</v-icon>
      <div class="mt-2">No hay categorías</div>
      <v-btn v-if="!billingStore.isReadOnly" color="primary" variant="text" class="mt-2" @click="openCreate">Crear primera categoría</v-btn>
    </v-card>

    <v-list v-else bg-color="transparent" lines="one">
      <v-list-item
        v-for="cat in filteredCategories"
        :key="cat._id"
        :title="cat.name"
        @click="!billingStore.isReadOnly && openEdit(cat)"
      >
        <template #prepend>
          <v-avatar :color="cat.color" size="40">
            <span class="text-white">{{ cat.icon || '?' }}</span>
          </v-avatar>
        </template>
        <template #append>
          <v-chip :color="cat.type === 'income' ? 'green' : 'red'" size="x-small" label class="mr-1">
            {{ cat.type === 'income' ? 'Ingreso' : 'Gasto' }}
          </v-chip>
          <v-btn v-if="!billingStore.isReadOnly" icon size="small" variant="text" color="error" @click.stop="confirmDelete(cat)">
            <v-icon size="18">mdi-delete</v-icon>
          </v-btn>
        </template>
      </v-list-item>
    </v-list>

    <v-dialog v-model="dialog" :fullscreen="isMobile" max-width="400">
      <v-card :title="editing ? 'Editar categoría' : 'Nueva categoría'" class="capture-form">
        <v-card-text>
          <label class="form-label">Tipo</label>
          <div class="segmented-toggle mb-3">
            <button
              type="button"
              class="segmented-toggle__option segmented-toggle__option--expense"
              :class="{ 'segmented-toggle__option--active': form.type === 'expense' }"
              @click="form.type = 'expense'"
            >
              Gasto
            </button>
            <button
              type="button"
              class="segmented-toggle__option segmented-toggle__option--income"
              :class="{ 'segmented-toggle__option--active': form.type === 'income' }"
              @click="form.type = 'income'"
            >
              Ingreso
            </button>
          </div>
          <v-text-field v-model="form.name" label="Nombre" variant="outlined" density="compact" required class="mb-3" />
          <v-text-field v-model="form.icon" label="Ícono (emoji)" variant="outlined" density="compact" class="mb-3" />
          <v-text-field v-model="form.color" label="Color" type="color" variant="outlined" density="compact" />
          <div class="d-flex align-center mt-1">
            <AIIconButton :name="form.name" :type="form.type" @generated="onIconGenerated" />
          </div>
        </v-card-text>
        <v-card-actions class="form-actions">
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-spacer />
          <v-btn class="form-actions__primary" @click="save">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>Confirmar</v-card-title>
        <v-card-text>¿Eliminar esta categoría?</v-card-text>
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
import { useCategoriesStore } from '@/stores/categories'
import { useSnackbar } from '@/stores/snackbar'
import { useSubscriptionStore } from '@/stores/subscriptions'
import AIIconButton from '@/components/AIIconButton.vue'

const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)

const store = useCategoriesStore()
const snackbar = useSnackbar()
const billingStore = useSubscriptionStore()
const tab = ref('all')
const dialog = ref(false)
const deleteDialog = ref(false)
const editing = ref(null)
const toDelete = ref(null)
const form = ref({ name: '', type: 'expense', icon: '', color: '#808080' })

const filteredCategories = computed(() => {
  if (tab.value === 'all') return store.categories
  return store.categories.filter(c => c.type === tab.value)
})

const openCreate = () => {
  editing.value = null
  form.value = { name: '', type: 'expense', icon: '', color: '#808080' }
  dialog.value = true
}

const openEdit = (cat) => {
  editing.value = cat._id
  form.value = { name: cat.name, type: cat.type, icon: cat.icon, color: cat.color }
  dialog.value = true
}

const save = async () => {
  try {
    if (editing.value) {
      await store.update(editing.value, form.value)
      snackbar.success('Categoría actualizada')
    } else {
      await store.create(form.value)
      snackbar.success('Categoría creada')
    }
    dialog.value = false
  } catch { snackbar.error('Error al guardar') }
}

const confirmDelete = (cat) => { toDelete.value = cat._id; deleteDialog.value = true }

const onIconGenerated = (data) => {
  if (data.icon) form.value.icon = data.icon
  if (data.color) form.value.color = data.color
}
const doDelete = async () => {
  try { await store.remove(toDelete.value); snackbar.success('Categoría eliminada') } catch { snackbar.error('Error') }
  deleteDialog.value = false
}

onMounted(() => store.fetchAll())
</script>
