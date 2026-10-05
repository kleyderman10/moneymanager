<template>
  <v-container class="py-6" style="max-width: 560px">
    <h1 class="text-h6 mb-4">Wake word debug</h1>
    <v-card variant="tonal" class="pa-4 mb-4">
      <div>State: <strong>{{ wakeWord.state }}</strong></div>
      <div>Supported: {{ wakeWord.supported }}</div>
      <div>Threshold: {{ threshold.toFixed(2) }}</div>
      <div>Current score: {{ wakeWord.score.toFixed(2) }}</div>
      <div>Peak: {{ wakeWord.peak.toFixed(2) }}</div>
      <div>Last detection: {{ last }}</div>
      <div>Detections: {{ wakeWord.detections }}</div>
      <div v-if="wakeWord.error" class="text-warning">Error: {{ wakeWord.error }}</div>
    </v-card>
    <v-progress-linear :model-value="wakeWord.score * 100" height="10" rounded class="mb-4" />
    <div class="d-flex ga-2 mb-4">
      <v-btn @click="start">Start</v-btn>
      <v-btn @click="wakeWord.stop()">Stop</v-btn>
      <v-btn @click="wakeWord.pause()">Pause</v-btn>
      <v-btn @click="wakeWord.resume()">Resume</v-btn>
    </div>
    <div class="text-caption">Threshold (debug only, not saved)</div>
    <v-slider v-model="threshold" min="0.2" max="0.95" step="0.05" hide-details thumb-label @update:model-value="wakeWord.setThreshold" />
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useWakeWordStore } from '@/stores/wakeword'

// Development only (route is registered under import.meta.env.DEV). Use it to calibrate the
// threshold on a real device: watch the score while saying the phrase and while talking normally.
const wakeWord = useWakeWordStore()
const threshold = ref(wakeWord.threshold)
const last = computed(() => (wakeWord.lastDetection
  ? `${wakeWord.lastDetection.phrase} (${wakeWord.lastDetection.score.toFixed(2)})`
  : '--'))

const start = () => {
  wakeWord.retry()
  return wakeWord.start()
}
</script>
