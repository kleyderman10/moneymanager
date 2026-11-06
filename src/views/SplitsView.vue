<template>
  <div>
    <div data-tour="page-intro" class="page-intro d-flex align-start align-sm-center flex-column flex-sm-row ga-3">
      <div>
        <div class="page-intro__eyebrow">{{ t('splits.eyebrow') }}</div>
        <h1 :class="isMobile ? 'text-h5' : 'text-h4'">{{ t('splits.title') }}</h1>
        <p class="page-intro__subtitle">{{ t('splits.subtitle') }}</p>
      </div>
      <v-spacer />
      <v-btn v-if="!isMobile && !billingStore.isReadOnly" color="primary" prepend-icon="mdi-plus" @click="openCreate">{{ t('splits.newSplit') }}</v-btn>
    </div>

    <v-tabs v-model="tab" color="primary" class="mb-4">
      <v-tab value="mine">{{ t('splits.tabMine') }}</v-tab>
      <v-tab value="received">
        {{ t('splits.tabReceived') }}
        <v-badge v-if="pendingReceived" :content="pendingReceived" color="error" inline />
      </v-tab>
    </v-tabs>

    <template v-if="tab === 'mine'">
      <v-card v-if="!store.splits.length && !store.loading" class="pa-8 text-center text-grey">
        <v-icon size="x-large" color="primary">mdi-account-multiple-plus</v-icon>
        <div class="mt-2 text-body-1">{{ t('splits.empty') }}</div>
        <div class="text-caption mt-1">{{ t('splits.emptyHint') }}</div>
      </v-card>

      <v-row v-else>
        <v-col v-for="split in store.splits" :key="split.id" cols="12" md="6" xl="4">
          <v-card>
            <v-card-title class="d-flex align-center">
              <div class="min-w-0">
                <div class="text-subtitle-1 text-truncate">{{ split.title }}</div>
                <div class="text-caption text-medium-emphasis">{{ date(split.date) }}</div>
              </div>
              <v-spacer />
              <v-btn icon="mdi-pencil-outline" size="small" variant="text" :aria-label="t('common.edit')" @click="openEdit(split)" />
              <v-btn icon="mdi-delete-outline" size="small" variant="text" color="error" :aria-label="t('common.delete')" @click="askDelete(split)" />
            </v-card-title>
            <v-card-text>
              <div class="kf-amount text-h5">{{ money(split.total, split.currency) }}</div>
              <div v-if="walletName(split)" class="text-caption text-medium-emphasis mb-1"><v-icon size="14">mdi-wallet-outline</v-icon> {{ t('splits.paidWith', { name: walletName(split) }) }}</div>
              <div class="text-caption text-medium-emphasis mb-2">
                {{ t('splits.collected') }}: <strong>{{ money(split.collected, split.currency) }}</strong>
                · {{ t('splits.pending') }}: <strong>{{ money(split.pending, split.currency) }}</strong>
              </div>
              <v-list density="compact" bg-color="transparent">
                <v-list-item v-for="person in split.participants" :key="person.id" :title="person.name" :subtitle="money(person.amount, split.currency)">
                  <template #append>
                    <v-chip size="x-small" :color="statusColor[person.status]" variant="tonal" class="mr-1">{{ t(`splits.status.${person.status}`) }}</v-chip>
                    <v-chip v-if="person.linked && !person.isOwner" size="x-small" color="primary" variant="outlined" class="mr-1">Flow</v-chip>
                    <v-btn v-if="!person.isOwner && person.status === 'pending'" icon="mdi-qrcode" size="x-small" variant="text" :aria-label="t('splits.share')" @click="openShare(split, person)" />
                    <v-btn v-if="!person.isOwner && person.status === 'reported'" icon="mdi-close-circle-outline" size="x-small" variant="text" color="error" :aria-label="t('splits.rejectReport')" @click="rejectReport(split, person)" />
                    <v-btn v-if="!person.isOwner && ['pending', 'accepted', 'reported'].includes(person.status)" :icon="person.status === 'reported' ? 'mdi-check-decagram' : 'mdi-check-circle-outline'" size="x-small" variant="text" color="success" :aria-label="person.status === 'reported' ? t('splits.confirmPaid') : t('splits.markPaid')" @click="markPaid(split, person)" />
                    <v-btn v-if="!person.isOwner && person.status === 'paid'" icon="mdi-undo-variant" size="x-small" variant="text" :aria-label="t('splits.undoPaid')" @click="markUnpaid(split, person)" />
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <template v-else>
      <v-card v-if="!receivedItems.length && !store.loading" class="pa-8 text-center text-grey">
        <v-icon size="x-large" color="primary">mdi-inbox-arrow-down</v-icon>
        <div class="mt-2 text-body-1">{{ t('splits.noReceived') }}</div>
      </v-card>
      <v-row v-else>
        <v-col v-for="item in receivedItems" :key="item.participantId" cols="12" md="6" xl="4">
          <v-card>
            <v-card-title class="text-subtitle-1">{{ item.title }}</v-card-title>
            <v-card-text>
              <div class="text-caption text-medium-emphasis">{{ t('splits.from', { name: item.ownerName }) }} · {{ date(item.date) }}</div>
              <div class="kf-amount text-h5 mt-1">{{ money(item.amount, item.currency) }}</div>
              <div class="text-caption text-medium-emphasis">{{ t('splits.ofTotal', { total: money(item.total, item.currency) }) }}</div>
              <v-chip size="small" :color="statusColor[item.status]" variant="tonal" class="mt-2">{{ t(`splits.status.${item.status}`) }}</v-chip>
              <div v-if="item.status === 'reported'" class="text-caption text-medium-emphasis mt-1">{{ t('splits.waitingConfirm', { name: item.ownerName }) }}</div>
            </v-card-text>
            <v-card-actions v-if="!billingStore.isReadOnly && item.status === 'pending'">
              <v-btn variant="text" @click="respond(item, 'decline')">{{ t('splits.decline') }}</v-btn>
              <v-spacer />
              <v-btn color="primary" variant="tonal" @click="respond(item, 'accept')">{{ t('splits.accept') }}</v-btn>
            </v-card-actions>
            <v-card-actions v-else-if="!billingStore.isReadOnly && item.status === 'accepted'">
              <v-btn color="success" variant="tonal" block prepend-icon="mdi-cash-check" :loading="reporting === item.participantId" @click="reportPaid(item)">{{ t('splits.reportPaid') }}</v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <SplitFormDialog v-model="formDialog" :split="editing" @created="onCreated" />
    <ShareSplitDialog v-model="shareDialog" :split="shareSplit" :participant="shareParticipant" @linked="store.fetchAll" />
    <ConfirmDialog v-model="deleteDialog" :title="t('splits.deleteTitle')" :message="t('splits.deleteConfirm')" :loading="deleting" @confirm="doDelete" />

    <v-btn v-if="isMobile && !billingStore.isReadOnly" icon="mdi-plus" color="primary" size="x-large" class="finance-fab" :aria-label="t('splits.newSplit')" @click="openCreate" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { useSplitsStore } from '@/stores/splits'
import { useSnackbar } from '@/stores/snackbar'
import { useWalletsStore } from '@/stores/wallets'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { useLocale } from '@/composables/useLocale'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import SplitFormDialog from '@/components/splits/SplitFormDialog.vue'
import ShareSplitDialog from '@/components/splits/ShareSplitDialog.vue'

const { t } = useI18n()
const { money, date } = useLocale()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const store = useSplitsStore()
const snackbar = useSnackbar()
const billingStore = useSubscriptionStore()

const route = useRoute()
const tab = ref(route.query.tab === 'received' ? 'received' : 'mine')
const formDialog = ref(false)
const editing = ref(null)
const shareDialog = ref(false)
const shareSplit = ref(null)
const shareParticipant = ref(null)
const deleteDialog = ref(false)
const deleting = ref(false)
const toDelete = ref(null)

const statusColor = { pending: 'warning', accepted: 'primary', reported: 'info', paid: 'success', declined: 'error' }
// Las rechazadas no se muestran; las aceptadas siguen visibles para poder reportar el pago.
const receivedItems = computed(() => store.received.filter((item) => item.status !== 'declined'))
const pendingReceived = computed(() => store.received.filter((item) => item.status === 'pending').length)
const reporting = ref(null)

const errorMessage = (error) => error?.response?.data?.message || t('splits.saveError')

const onCreated = (split) => {
  // Si hay alguien a quien compartirle la parte, se ofrece de inmediato.
  const first = split.participants.find((p) => !p.isOwner && !p.linked)
  if (first) openShare(split, first)
}

const openShare = (split, person) => {
  shareSplit.value = split
  shareParticipant.value = person
  shareDialog.value = true
}

const walletsStore = useWalletsStore()
const walletName = (split) => walletsStore.wallets.find((w) => w._id === split.wallet)?.name || ''

const openCreate = () => {
  editing.value = null
  formDialog.value = true
}
const openEdit = (split) => {
  editing.value = split
  formDialog.value = true
}

const markUnpaid = async (split, person) => {
  try {
    await store.markUnpaid(split.id, person.id)
    walletsStore.fetchAll()
    snackbar.success(t('splits.undoneMsg'))
  } catch (error) {
    snackbar.error(errorMessage(error))
  }
}

const markPaid = async (split, person) => {
  try {
    await store.markPaid(split.id, person.id)
    walletsStore.fetchAll()
    snackbar.success(t('splits.markedPaid'))
  } catch (error) {
    snackbar.error(errorMessage(error))
  }
}

const rejectReport = async (split, person) => {
  try {
    await store.rejectReport(split.id, person.id)
    snackbar.success(t('splits.reportRejected'))
  } catch (error) {
    snackbar.error(errorMessage(error))
  }
}

const reportPaid = async (item) => {
  reporting.value = item.participantId
  try {
    await store.reportPaid(item)
    snackbar.success(t('splits.reportSent'))
  } catch (error) {
    snackbar.error(errorMessage(error))
  }
  reporting.value = null
}

const respond = async (item, action) => {
  try {
    await store.respond(item, action)
    snackbar.success(t(action === 'accept' ? 'splits.accepted' : 'splits.declined'))
  } catch (error) {
    snackbar.error(errorMessage(error))
  }
}

const askDelete = (split) => {
  toDelete.value = split
  deleteDialog.value = true
}

const doDelete = async () => {
  deleting.value = true
  try {
    await store.remove(toDelete.value.id)
    walletsStore.fetchAll()
    deleteDialog.value = false
  } catch (error) {
    snackbar.error(errorMessage(error))
  }
  deleting.value = false
}

onMounted(() => { store.fetchAll(); walletsStore.fetchAll() })
</script>
