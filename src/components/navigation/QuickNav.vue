<template>
  <v-dialog :model-value="modelValue" max-width="480" @update:model-value="emit('update:modelValue', $event)">
    <v-card>
      <v-card-text class="pb-0">
        <v-text-field
          ref="field"
          v-model="query"
          :label="t('layout.quickNav')"
          prepend-inner-icon="mdi-magnify"
          clearable
          hide-details
          autofocus
          @keydown.enter.prevent="goTo(results[0])"
        />
      </v-card-text>
      <v-list density="comfortable" class="quick-nav__list">
        <v-list-item
          v-for="item in results"
          :key="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          :subtitle="item.section"
          @click="goTo(item)"
        />
        <v-list-item v-if="!results.length" :title="t('layout.quickNavEmpty')" disabled />
      </v-list>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNavSections } from '@/composables/useNavSections'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()
const router = useRouter()
const sections = useNavSections(() => props.isAdmin)
const query = ref('')

const normalize = (value) => String(value || '').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const results = computed(() => {
  const needle = normalize(query.value).trim()
  return sections.value
    .flatMap((section) => section.items.map((item) => ({ ...item, section: section.title })))
    .filter((item) => !needle || normalize(item.title).includes(needle))
})

const goTo = (item) => {
  if (!item) return
  emit('update:modelValue', false)
  router.push(item.to)
}

watch(() => props.modelValue, (open) => { if (open) query.value = '' })
</script>

<style scoped>
.quick-nav__list { max-height: 50vh; overflow-y: auto; }
</style>
