import { defineStore } from 'pinia'
import { ref } from 'vue'
import { aiAPI } from '@/api'

export const useAiInsights = defineStore('aiInsights', () => {
  const insights = ref([])
  const healthScore = ref(null)
  const analysis = ref(null)
  const loading = ref(false)

  const fetchInsights = async () => {
    try {
      const res = await aiAPI.getInsights()
      insights.value = res.data
    } catch { /* ignore */ }
  }

  const fetchHealthScore = async () => {
    try {
      const res = await aiAPI.healthScore()
      healthScore.value = res.data
    } catch { /* ignore */ }
  }

  const refreshInsights = async () => {
    loading.value = true
    try {
      const res = await aiAPI.refreshInsights()
      insights.value = res.data
    } finally { loading.value = false }
  }

  const dismissInsight = async (id) => {
    try {
      await aiAPI.dismissInsight(id)
      insights.value = insights.value.filter((i) => i._id !== id)
    } catch { /* ignore */ }
  }

  const fetchAnalysis = async () => {
    loading.value = true
    try {
      const res = await aiAPI.analyze()
      analysis.value = res.data
    } finally { loading.value = false }
  }

  return { insights, healthScore, analysis, loading, fetchInsights, fetchHealthScore, refreshInsights, dismissInsight, fetchAnalysis }
})
