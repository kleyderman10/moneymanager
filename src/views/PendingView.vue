<template>
  <div>
    <div data-tour="page-intro" class="page-intro d-flex align-start align-sm-center flex-column flex-sm-row ga-3">
      <div>
        <div class="page-intro__eyebrow">{{ t('pending.eyebrow') }}</div>
        <h1 :class="isMobile ? 'text-h5' : 'text-h4'">{{ t('pending.title') }}</h1>
        <p class="page-intro__subtitle">{{ t('pending.subtitle') }}</p>
      </div>
      <v-spacer />
      <div class="d-flex ga-2 flex-wrap">
        <v-btn v-if="canReadClipboard" variant="tonal" prepend-icon="mdi-content-paste" :loading="reading" @click="readClipboard">{{ t('pending.fromClipboard') }}</v-btn>
        <v-btn color="primary" prepend-icon="mdi-text-box-plus-outline" @click="pasteDialog = true">{{ t('pending.addText') }}</v-btn>
      </div>
    </div>

    <v-card v-if="!store.items.length && !store.loading" class="pa-8 text-center text-grey">
      <v-icon size="x-large" color="primary">mdi-check-all</v-icon>
      <div class="mt-2 text-body-1">{{ t('pending.empty') }}</div>
      <div class="text-caption mt-1">{{ t('pending.emptyHint') }}</div>
    </v-card>

    <v-row v-else>
      <v-col v-for="item in store.items" :key="item.id" cols="12" md="6" xl="4">
        <v-card>
          <v-card-text>
            <div class="d-flex align-center mb-2">
              <v-chip size="small" :color="drafts[item.id].type === 'income' ? 'success' : 'error'" variant="tonal">
                {{ drafts[item.id].type === 'income' ? t('pending.income') : t('pending.expense') }}
              </v-chip>
              <v-chip v-if="item.possibleDuplicate" size="small" color="warning" variant="tonal" class="ml-2" prepend-icon="mdi-content-copy">{{ t('pending.possibleDuplicate') }}</v-chip>
              <v-spacer />
              <span class="text-caption text-medium-emphasis">{{ date(item.date) }}</span>
            </div>
            <MoneyField v-model="drafts[item.id].amount" :label="t('pending.amount')" />
            <v-text-field v-model="drafts[item.id].description" :label="t('pending.description')" density="compact" maxlength="120" class="mt-3" hide-details />
            <NativeSelectField
              v-model="drafts[item.id].wallet"
              :items="wallets"
              item-title="name"
              item-value="_id"
              :label="walletLabel(item)"
              :placeholder="t('pending.noWallet')"
              class="mt-3"
            />
            <NativeSelectField
              v-model="drafts[item.id].category"
              :items="categoriesFor(drafts[item.id].type)"
              item-title="name"
              item-value="_id"
              :label="t('pending.category')"
              :placeholder="t('pending.chooseCategory')"
              class="mt-3"
            />
            <div class="text-caption text-medium-emphasis mt-2">{{ t('pending.effectHint') }}</div>
          </v-card-text>
          <v-card-actions>
            <v-btn variant="text" :disabled="busy === item.id" @click="dismiss(item)">{{ t('pending.dismiss') }}</v-btn>
            <v-spacer />
            <v-btn color="primary" variant="flat" :loading="busy === item.id" :disabled="!drafts[item.id].category || !(drafts[item.id].amount > 0)" @click="confirm(item)">{{ t('pending.confirm') }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="pasteDialog" max-width="480">
      <v-card :title="t('pending.addText')">
        <v-card-text>
          <p class="text-body-2 text-grey mb-3">{{ t('pending.addTextBody') }}</p>
          <v-textarea v-model="pasteText" :label="t('transactions.pasteNotificationLabel')" :placeholder="t('transactions.pasteNotificationPlaceholder')" rows="4" maxlength="1000" counter auto-grow />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="pasteDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" :disabled="pasteText.trim().length < 3" :loading="adding" @click="addText">{{ t('pending.detect') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { usePendingStore } from '@/stores/pending'
import { useWalletsStore } from '@/stores/wallets'
import { useCategoriesStore } from '@/stores/categories'
import { useSnackbar } from '@/stores/snackbar'
import { useLocale } from '@/composables/useLocale'
import MoneyField from '@/components/MoneyField.vue'
import NativeSelectField from '@/components/NativeSelectField.vue'

const { t } = useI18n()
const { date } = useLocale()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const store = usePendingStore()
const walletsStore = useWalletsStore()
const categoriesStore = useCategoriesStore()
const snackbar = useSnackbar()

const wallets = computed(() => walletsStore.wallets)
const categoriesFor = (type) => categoriesStore.categories.filter((c) => c.type === type)

// Borrador editable de cada propuesta: el usuario puede corregir antes de confirmar.
const drafts = ref({})
watch(() => store.items, (items) => {
  items.forEach((item) => {
    if (!drafts.value[item.id]) {
      drafts.value[item.id] = {
        amount: item.amount,
        type: item.type,
        description: item.description,
        wallet: item.wallet,
        category: item.category,
      }
    }
  })
}, { immediate: true, deep: true })

const walletLabel = (item) => (item.walletSource
  ? `${t('pending.wallet')} · ${t('pending.suggested')}`
  : t('pending.wallet'))

const busy = ref(null)
const errorMessage = (error) => error?.response?.data?.message || t('pending.error')

const confirm = async (item) => {
  const draft = drafts.value[item.id]
  busy.value = item.id
  try {
    await store.confirm(item.id, {
      amount: draft.amount,
      type: draft.type,
      description: draft.description,
      category: draft.category,
      wallet: draft.wallet || null,
    })
    walletsStore.fetchAll()
    snackbar.success(t('pending.confirmed'))
  } catch (error) {
    snackbar.error(errorMessage(error))
  }
  busy.value = null
}

const dismiss = async (item) => {
  busy.value = item.id
  try {
    await store.dismiss(item.id)
  } catch (error) {
    snackbar.error(errorMessage(error))
  }
  busy.value = null
}

const pasteDialog = ref(false)
const pasteText = ref('')
const adding = ref(false)
const reading = ref(false)
const canReadClipboard = typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.readText)

const submitText = async (text, source) => {
  try {
    const { duplicate } = await store.addFromText(text, source)
    snackbar[duplicate ? 'info' : 'success'](t(duplicate ? 'pending.alreadyAdded' : 'pending.added'))
    return true
  } catch (error) {
    snackbar.error(error?.response?.status === 422 ? t('transactions.pasteNotRecognized') : errorMessage(error))
    return false
  }
}

const addText = async () => {
  adding.value = true
  if (await submitText(pasteText.value, 'paste')) {
    pasteDialog.value = false
    pasteText.value = ''
  }
  adding.value = false
}

const readClipboard = async () => {
  reading.value = true
  try {
    const text = (await navigator.clipboard.readText()).slice(0, 1000)
    if (text.trim().length < 3) snackbar.info(t('pending.clipboardEmpty'))
    else await submitText(text, 'clipboard')
  } catch {
    snackbar.info(t('transactions.pasteManually'))
  }
  reading.value = false
}

onMounted(async () => {
  await Promise.all([store.fetchAll(), walletsStore.fetchAll(), categoriesStore.fetchCached()])
})
</script>
