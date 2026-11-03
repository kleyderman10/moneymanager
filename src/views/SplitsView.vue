<template>
  <div>
    <div data-tour="page-intro" class="page-intro d-flex align-start align-sm-center flex-column flex-sm-row ga-3">
      <div>
        <div class="page-intro__eyebrow">{{ t('splits.eyebrow') }}</div>
        <h1 :class="isMobile ? 'text-h5' : 'text-h4'">{{ t('splits.title') }}</h1>
        <p class="page-intro__subtitle">{{ t('splits.subtitle') }}</p>
      </div>
      <v-spacer />
      <v-btn v-if="!isMobile && !billingStore.isReadOnly" color="primary" prepend-icon="mdi-plus" @click="formDialog = true">{{ t('splits.newSplit') }}</v-btn>
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
              <v-btn icon="mdi-delete-outline" size="small" variant="text" color="error" :aria-label="t('common.delete')" @click="askDelete(split)" />
            </v-card-title>
            <v-card-text>
              <div class="kf-amount text-h5">{{ money(split.total, split.currency) }}</div>
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
                    <v-btn v-if="!person.isOwner && ['pending', 'accepted'].includes(person.status)" icon="mdi-check-circle-outline" size="x-small" variant="text" color="success" :aria-label="t('splits.markPaid')" @click="markPaid(split, person)" />
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <template v-else>
      <v-card v-if="!store.received.length && !store.loading" class="pa-8 text-center text-grey">
        <v-icon size="x-large" color="primary">mdi-inbox-arrow-down</v-icon>
        <div class="mt-2 text-body-1">{{ t('splits.noReceived') }}</div>
      </v-card>
      <v-row v-else>
        <v-col v-for="item in store.received" :key="item.participantId" cols="12" md="6" xl="4">
          <v-card>
            <v-card-title class="text-subtitle-1">{{ item.title }}</v-card-title>
            <v-card-text>
              <div class="text-caption text-medium-emphasis">{{ t('splits.from', { name: item.ownerName }) }} · {{ date(item.date) }}</div>
              <div class="kf-amount text-h5 mt-1">{{ money(item.amount, item.currency) }}</div>
              <div class="text-caption text-medium-emphasis">{{ t('splits.ofTotal', { total: money(item.total, item.currency) }) }}</div>
            </v-card-text>
            <v-card-actions v-if="!billingStore.isReadOnly">
              <v-btn variant="text" @click="respond(item, 'decline')">{{ t('splits.decline') }}</v-btn>
              <v-spacer />
              <v-btn color="primary" variant="tonal" @click="respond(item, 'accept')">{{ t('splits.accept') }}</v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <SplitFormDialog v-model="formDialog" @created="onCreated" />
    <ShareSplitDialog v-model="shareDialog" :split="shareSplit" :participant="shareParticipant" @linked="store.fetchAll" />
    <ConfirmDialog v-model="deleteDialog" :title="t('splits.deleteTitle')" :message="t('splits.deleteConfirm')" :loading="deleting" @confirm="doDelete" />

    <v-btn v-if="isMobile && !billingStore.isReadOnly" icon="mdi-plus" color="primary" size="x-large" class="finance-fab" :aria-label="t('splits.newSplit')" @click="formDialog = true" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { useSplitsStore } from '@/stores/splits'
import { useSnackbar } from '@/stores/snackbar'
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

const tab = ref('mine')
const formDialog = ref(false)
const shareDialog = ref(false)
const shareSplit = ref(null)
const shareParticipant = ref(null)
const deleteDialog = ref(false)
const deleting = ref(false)
const toDelete = ref(null)

const statusColor = { pending: 'warning', accepted: 'primary', paid: 'success', declined: 'error' }
const pendingReceived = computed(() => store.received.length)

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

const markPaid = async (split, person) => {
  try {
    await store.markPaid(split.id, person.id)
    snackbar.success(t('splits.markedPaid'))
  } catch (error) {
    snackbar.error(errorMessage(error))
  }
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
    deleteDialog.value = false
  } catch (error) {
    snackbar.error(errorMessage(error))
  }
  deleting.value = false
}

onMounted(() => store.fetchAll())
</script>
