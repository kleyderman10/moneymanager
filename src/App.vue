<template>
  <v-app>
    <router-view />
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
      location="bottom right"
      rounded="lg"
      elevation="10"
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn v-if="snackbar.action" variant="text" @click="runAction">{{ snackbar.action.label }}</v-btn>
        <v-btn variant="text" @click="snackbar.show = false">OK</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { useSnackbar } from '@/stores/snackbar'
const snackbar = useSnackbar()
const runAction = () => {
  const { handler } = snackbar.action
  snackbar.show = false
  handler()
}
</script>
