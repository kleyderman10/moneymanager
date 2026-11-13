<template>
  <div>
    <v-alert v-if="failed" type="warning" variant="tonal" class="mb-3" :text="t('common.loadError')">
      <template #append>
        <v-btn variant="text" @click="load(1)">{{ t('common.retry') }}</v-btn>
      </template>
    </v-alert>
    <!-- Phones: one card per entry; four columns do not fit a 360px screen. -->
    <div v-if="isMobile">
      <div v-for="row in items" :key="row._id" class="kf-row audit-row">
        <div class="kf-row__body">
          <div class="kf-row__title">{{ actionLabel(row.action) }}</div>
          <div class="kf-row__meta audit-row__meta">{{ row.admin?.email || '—' }}</div>
          <div class="kf-row__meta audit-row__meta">{{ t('admin.audit.target') }}: {{ row.targetId || '—' }}</div>
          <div class="kf-row__meta">{{ dateLong(row.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}</div>
        </div>
      </div>
      <v-card v-if="!loading && !items.length" class="pa-6 text-center text-medium-emphasis">{{ t('admin.audit.empty') }}</v-card>
    </div>
    <v-card v-else>
      <v-table>
        <thead>
          <tr>
            <th>{{ t('admin.audit.when') }}</th>
            <th>{{ t('admin.audit.admin') }}</th>
            <th>{{ t('admin.audit.action') }}</th>
            <th>{{ t('admin.audit.target') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in items" :key="row._id">
            <td>{{ dateLong(row.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}</td>
            <td>{{ row.admin?.email || '—' }}</td>
            <td>{{ actionLabel(row.action) }}</td>
            <td class="text-caption">{{ row.targetId }}</td>
          </tr>
          <tr v-if="!loading && !items.length">
            <td colspan="4" class="text-center text-medium-emphasis py-6">{{ t('admin.audit.empty') }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
    <div v-if="totalPages > 1" class="d-flex justify-center mt-4">
      <v-pagination :model-value="page" :length="totalPages" density="comfortable" :total-visible="5" @update:model-value="load" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import { adminAPI } from '@/api'
import { useLocale } from '@/composables/useLocale'

const { t, te } = useI18n()
const { dateLong } = useLocale()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)

const items = ref([])
const page = ref(1)
const totalPages = ref(1)
const loading = ref(false)
const failed = ref(false)

const actionLabel = (action) => (te(`admin.audit.actions.${action.replace('.', '_')}`) ? t(`admin.audit.actions.${action.replace('.', '_')}`) : action)

const load = async (nextPage = 1) => {
  loading.value = true
  failed.value = false
  try {
    const { data } = await adminAPI.getAuditLog({ page: nextPage })
    items.value = data.items
    page.value = data.page
    totalPages.value = data.totalPages
  } catch {
    failed.value = true
  }
  loading.value = false
}

onMounted(() => load(1))
</script>

<style scoped>
.audit-row { align-items: flex-start; }
.audit-row__meta { white-space: normal; overflow-wrap: anywhere; }
</style>
