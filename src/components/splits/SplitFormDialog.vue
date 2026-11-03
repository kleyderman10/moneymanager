<template>
  <v-dialog :model-value="modelValue" :fullscreen="isMobile" max-width="640" scrollable @update:model-value="emit('update:modelValue', $event)">
    <v-card :title="isEdit ? t('splits.editSplit') : t('splits.newSplit')">
      <v-card-text>
        <v-alert v-if="locked" type="info" variant="tonal" density="compact" class="mb-3">{{ t('splits.lockedHint') }}</v-alert>
        <ReceiptScanner v-if="!isEdit" class="mb-3" @scanned="applyScan" />
        <v-text-field v-model="form.title" :label="t('splits.titleLabel')" density="compact" maxlength="120" />
        <fieldset class="split-fieldset" :disabled="locked">
          <MoneyField v-model="form.total" :label="t('splits.total')" />
          <NativeSelectField v-model="form.mode" :items="modeOptions" :label="t('splits.mode')" :disabled="locked" class="mt-3" />
        </fieldset>
        <v-text-field v-model="form.date" :label="t('splits.dateLabel')" type="date" density="compact" class="mt-3" />
        <NativeSelectField v-model="form.wallet" :items="wallets" item-title="name" item-value="_id" :label="t('splits.walletLabel')" :placeholder="t('splits.noWallet')" class="mt-3" />
        <div class="text-caption text-medium-emphasis mt-1">{{ t('splits.walletHint') }}</div>
        <v-text-field v-model="form.notes" :label="t('splits.notesLabel')" density="compact" maxlength="500" class="mt-3" />
        <fieldset class="split-fieldset" :disabled="locked">

        <div class="text-subtitle-2 mt-4 mb-1">{{ t('splits.participants') }}</div>
        <div v-for="(person, index) in form.participants" :key="index" class="split-person">
          <v-text-field v-model="person.name" :label="t('splits.name')" density="compact" hide-details class="flex-grow-1" />
          <v-text-field v-model="person.email" :label="t('splits.emailOptional')" type="email" density="compact" hide-details class="flex-grow-1" :disabled="person.isOwner" />
          <v-text-field v-if="form.mode === 'percentage'" v-model.number="person.percentage" label="%" type="number" min="0" max="100" density="compact" hide-details style="max-width: 90px" />
          <v-text-field v-else-if="form.mode === 'fixed'" v-model.number="person.amount" :label="t('splits.amount')" type="number" min="0" density="compact" hide-details style="max-width: 120px" />
          <v-btn v-if="form.participants.length > 1" icon="mdi-close" size="x-small" variant="text" :aria-label="t('common.delete')" @click="removePerson(index)" />
        </div>
        <v-btn size="small" variant="text" prepend-icon="mdi-account-plus" class="mt-1" @click="addPerson">{{ t('splits.addPerson') }}</v-btn>

        <template v-if="form.mode === 'items'">
          <div class="text-subtitle-2 mt-4 mb-1">{{ t('splits.items') }}</div>
          <div v-for="(item, index) in form.items" :key="index" class="split-item">
            <div class="d-flex ga-2 align-center">
              <v-text-field v-model="item.description" :label="t('splits.itemName')" density="compact" hide-details />
              <v-text-field v-model.number="item.amount" :label="t('splits.amount')" type="number" min="0" density="compact" hide-details style="max-width: 120px" />
              <v-btn icon="mdi-close" size="x-small" variant="text" :aria-label="t('common.delete')" @click="form.items.splice(index, 1)" />
            </div>
            <div class="d-flex flex-wrap ga-1 mt-1">
              <v-chip
                v-for="(person, personIndex) in form.participants"
                :key="personIndex"
                size="small"
                :color="item.assignedTo.includes(personIndex) ? 'primary' : undefined"
                :variant="item.assignedTo.includes(personIndex) ? 'flat' : 'outlined'"
                @click="toggleAssign(item, personIndex)"
              >{{ person.name || `#${personIndex + 1}` }}</v-chip>
            </div>
          </div>
          <v-btn size="small" variant="text" prepend-icon="mdi-plus" @click="addItem">{{ t('splits.addItem') }}</v-btn>
          <div class="text-caption text-medium-emphasis mt-1">{{ t('splits.itemsHint') }}</div>
        </template>
        </fieldset>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" :loading="saving" :disabled="!canSave" @click="save">{{ isEdit ? t('splits.saveChanges') : t('splits.createSplit') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { useSplitsStore } from '@/stores/splits'
import { useWalletsStore } from '@/stores/wallets'
import { useSnackbar } from '@/stores/snackbar'
import ReceiptScanner from '@/components/ReceiptScanner.vue'
import MoneyField from '@/components/MoneyField.vue'
import NativeSelectField from '@/components/NativeSelectField.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // Si se pasa una cuenta, el diálogo la edita en vez de crear una nueva.
  split: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'created', 'saved'])

const { t } = useI18n()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const store = useSplitsStore()
const walletsStore = useWalletsStore()
const wallets = computed(() => walletsStore.wallets)
const snackbar = useSnackbar()
const saving = ref(false)

const blank = () => ({
  title: '',
  total: null,
  mode: 'equal',
  source: 'manual',
  date: null,
  wallet: null,
  notes: '',
  participants: [{ name: t('splits.me'), email: '', isOwner: true }, { name: '', email: '' }],
  items: [],
})

// Carga una cuenta existente para editarla.
const fromSplit = (split) => ({
  title: split.title,
  total: split.total,
  mode: split.mode,
  source: split.source,
  date: split.date ? String(split.date).slice(0, 10) : null,
  wallet: split.wallet,
  notes: split.notes || '',
  participants: split.participants.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email || '',
    isOwner: p.isOwner,
    percentage: p.percentage,
    amount: p.amount,
  })),
  items: (split.items || []).map((i) => ({ description: i.description, amount: i.amount, assignedTo: [...(i.assignedTo || [])] })),
})

const isEdit = computed(() => Boolean(props.split))
// Con alguien que ya aceptó o pagó, el total y las personas no se pueden tocar.
const locked = computed(() => Boolean(props.split?.locked))
const form = ref(blank())

watch(() => props.modelValue, (open) => {
  if (!open) return
  form.value = props.split ? fromSplit(props.split) : blank()
  walletsStore.fetchAll()
})

const modeOptions = computed(() => [
  { title: t('splits.modeEqual'), value: 'equal' },
  { title: t('splits.modePercentage'), value: 'percentage' },
  { title: t('splits.modeFixed'), value: 'fixed' },
  { title: t('splits.modeItems'), value: 'items' },
])

const addPerson = () => form.value.participants.push({ name: '', email: '' })
const removePerson = (index) => {
  form.value.participants.splice(index, 1)
  // Las asignaciones guardan posiciones: al borrar a alguien se reajustan.
  form.value.items.forEach((item) => {
    item.assignedTo = item.assignedTo.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i))
  })
}
const addItem = () => form.value.items.push({ description: '', amount: null, assignedTo: [] })
const toggleAssign = (item, personIndex) => {
  const at = item.assignedTo.indexOf(personIndex)
  if (at === -1) item.assignedTo.push(personIndex)
  else item.assignedTo.splice(at, 1)
}

const applyScan = (data) => {
  form.value.source = 'scan'
  if (data.merchant) form.value.title = data.merchant
  if (data.amount) form.value.total = Number(data.amount)
  if (data.date) form.value.date = data.date
  if (data.items?.length > 1) {
    form.value.items = data.items.map((item) => ({ description: item.description, amount: Number(item.amount) || 0, assignedTo: [] }))
    form.value.mode = 'items'
  }
}

const canSave = computed(() => (
  form.value.title.trim() && form.value.total > 0 && form.value.participants.every((p) => p.name.trim())
))

const save = async () => {
  const f = form.value
  const common = {
    title: f.title.trim(),
    ...(f.date ? { date: f.date } : {}),
    wallet: f.wallet || null,
    notes: f.notes || '',
  }
  const structure = {
    total: f.total,
    mode: f.mode,
    participants: f.participants.map((p) => ({
      ...(p.id ? { id: p.id } : {}),
      name: p.name.trim(),
      ...(p.email?.trim() ? { email: p.email.trim() } : {}),
      ...(p.isOwner ? { isOwner: true } : {}),
      ...(f.mode === 'percentage' ? { percentage: p.percentage ?? 0 } : {}),
      ...(f.mode === 'fixed' ? { amount: p.amount ?? 0 } : {}),
    })),
    ...(f.mode === 'items' ? { items: f.items.map((i) => ({ description: i.description || t('splits.item'), amount: i.amount || 0, assignedTo: i.assignedTo })) } : {}),
  }
  saving.value = true
  try {
    if (isEdit.value) {
      // Bloqueada: solo viajan los campos que el servidor permite cambiar.
      await store.update(props.split.id, locked.value ? common : { ...common, ...structure })
      snackbar.success(t('splits.updated'))
      emit('update:modelValue', false)
      emit('saved')
    } else {
      const created = await store.create({ ...common, ...structure, source: f.source })
      snackbar.success(t('splits.created'))
      emit('update:modelValue', false)
      emit('created', created)
    }
    walletsStore.fetchAll()
  } catch (error) {
    const first = error?.response?.data?.errors?.[0]?.message
    snackbar.error(first || error?.response?.data?.message || t('splits.saveError'))
  }
  saving.value = false
}
</script>

<style scoped>
.split-fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
.split-fieldset:disabled { opacity: 0.55; }
.split-person { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
.split-item { margin-bottom: 12px; padding: 8px; border: 1px solid rgba(var(--v-border-color), 0.2); border-radius: 8px; }
</style>
