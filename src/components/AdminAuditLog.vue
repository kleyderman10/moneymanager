<template>
  <div>
    <v-alert v-if="failed" type="warning" variant="tonal" class="mb-3" :text="t('common.loadError')">
      <template #append>
        <v-btn variant="text" @click="load(1)">{{ t('common.retry') }}</v-btn>
      </template>
    </v-alert>
    <v-card>
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
      <v-pagination :model-value="page" :length="totalPages" density="comfortable" @update:model-value="load" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminAPI } from '@/api'
import { useLocale } from '@/composables/useLocale'

const { t, te } = useI18n()
const { dateLong } = useLocale()

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
