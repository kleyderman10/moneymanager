<template>
  <div>
    <div class="page-intro">
      <div class="page-intro__eyebrow">{{ t('about.product') }}</div>
      <h1 :class="isMobile ? 'text-h5' : 'text-h4'">{{ t('about.title') }}</h1>
      <p class="page-intro__subtitle">{{ t('about.subtitle') }}</p>
    </div>

    <v-card class="mb-4">
      <v-card-title class="text-h5 font-weight-bold">{{ t('layout.brandName') }}</v-card-title>
      <v-card-subtitle class="text-body-1 font-italic">{{ t('about.byline') }}</v-card-subtitle>
      <v-card-text>
        <p class="text-body-1">
          {{ t('about.intro') }}
        </p>
      </v-card-text>
    </v-card>

    <v-row>
      <v-col cols="12" sm="6" md="4">
        <v-card class="h-100">
          <v-card-title>
            <v-icon color="primary" class="mr-2">mdi-cash-multiple</v-icon>
            {{ t('nav.transactions') }}
          </v-card-title>
          <v-card-text>
            {{ t('about.transactionsBody') }}
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="h-100">
          <v-card-title>
            <v-icon color="primary" class="mr-2">mdi-chart-pie</v-icon>
            {{ t('nav.budgets') }}
          </v-card-title>
          <v-card-text>
            {{ t('about.budgetsBody') }}
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="h-100">
          <v-card-title>
            <v-icon color="primary" class="mr-2">mdi-target</v-icon>
            {{ t('about.financialGoals') }}
          </v-card-title>
          <v-card-text>
            {{ t('about.goalsBody') }}
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="h-100">
          <v-card-title>
            <v-icon color="primary" class="mr-2">mdi-wallet</v-icon>
            {{ t('about.wallets') }}
          </v-card-title>
          <v-card-text>
            {{ t('about.walletsBody') }}
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="h-100">
          <v-card-title>
            <v-icon color="primary" class="mr-2">mdi-sync</v-icon>
            {{ t('nav.recurring') }}
          </v-card-title>
          <v-card-text>
            {{ t('about.recurringBody') }}
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="h-100">
          <v-card-title>
            <v-icon color="primary" class="mr-2">mdi-file-chart</v-icon>
            {{ t('nav.reports') }}
          </v-card-title>
          <v-card-text>
            {{ t('about.reportsBody') }}
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="mt-4" color="primary" theme="dark">
      <v-card-title class="text-h5">
        <v-icon class="mr-2">mdi-robot</v-icon>
        {{ t('about.aiPowered') }}
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6">
            <p class="mb-2"><strong>{{ t('about.aiChat') }}:</strong> {{ t('about.aiChatBody') }}</p>
            <p class="mb-2"><strong>{{ t('about.aiInsights') }}:</strong> {{ t('about.aiInsightsBody') }}</p>
            <p class="mb-2"><strong>{{ t('about.healthScore') }}:</strong> {{ t('about.healthScoreBody') }}</p>
          </v-col>
          <v-col cols="12" sm="6">
            <p class="mb-2"><strong>{{ t('about.categorySuggestion') }}:</strong> {{ t('about.categorySuggestionBody') }}</p>
            <p class="mb-2"><strong>{{ t('about.budgetRecommendation') }}:</strong> {{ t('about.budgetRecommendationBody') }}</p>
            <p class="mb-2"><strong>{{ t('about.receiptScan') }}:</strong> {{ t('about.receiptScanBody') }}</p>
            <p class="mb-2"><strong>{{ t('about.voiceInput') }}:</strong> {{ t('about.voiceInputBody') }}</p>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
</script>
