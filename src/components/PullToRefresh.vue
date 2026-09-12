<template>
  <div>
    <v-progress-linear
      v-if="refreshing"
      indeterminate
      color="primary"
      absolute
      top
    />
    <slot />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({ onRefresh: { type: Function, default: null } })
const refreshing = ref(false)

const refresh = async () => {
  if (!props.onRefresh || refreshing.value) return
  refreshing.value = true
  try {
    await props.onRefresh()
  } finally {
    refreshing.value = false
  }
}

defineExpose({ refresh })
</script>
