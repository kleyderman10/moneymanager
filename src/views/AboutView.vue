<template>
  <div>
    <div class="page-intro">
      <div class="page-intro__eyebrow">{{ t('about.product') }}</div>
      <h1 :class="isMobile ? 'text-h5' : 'text-h4'">{{ t('about.title') }}</h1>
      <p class="page-intro__subtitle">{{ t('about.subtitle') }}</p>
    </div>

    <v-card class="kf-card-hero about-hero mb-4">
      <img :src="flowBanner" :alt="t('layout.brandTagline')" class="about-hero__banner" width="1794" height="876" />
    </v-card>

    <v-card class="mb-4">
      <v-card-title class="d-flex align-center ga-3 about-card__title">
        <span class="kf-icon-tile"><v-icon size="20">mdi-information-outline</v-icon></span>
        <div>
          <div class="text-h6 font-weight-bold">{{ t('about.title') }}</div>
          <div class="text-caption text-medium-emphasis font-weight-regular">{{ t('layout.brandTagline') }}</div>
        </div>
      </v-card-title>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis font-italic mb-2">{{ t('about.byline') }}</p>
        <p class="text-body-1 mb-0">{{ t('about.intro') }}</p>
      </v-card-text>
    </v-card>

    <v-row>
      <v-col cols="12" sm="6" md="4">
        <v-card class="h-100">
          <v-card-title class="d-flex align-center about-card__title">
            <span class="kf-icon-tile mr-3"><v-icon size="20">mdi-cash-multiple</v-icon></span>
            {{ t('nav.transactions') }}
          </v-card-title>
          <v-card-text>
            {{ t('about.transactionsBody') }}
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="h-100">
          <v-card-title class="d-flex align-center about-card__title">
            <span class="kf-icon-tile mr-3"><v-icon size="20">mdi-chart-pie</v-icon></span>
            {{ t('nav.budgets') }}
          </v-card-title>
          <v-card-text>
            {{ t('about.budgetsBody') }}
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="h-100">
          <v-card-title class="d-flex align-center about-card__title">
            <span class="kf-icon-tile mr-3"><v-icon size="20">mdi-target</v-icon></span>
            {{ t('about.financialGoals') }}
          </v-card-title>
          <v-card-text>
            {{ t('about.goalsBody') }}
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="h-100">
          <v-card-title class="d-flex align-center about-card__title">
            <span class="kf-icon-tile mr-3"><v-icon size="20">mdi-wallet</v-icon></span>
            {{ t('about.wallets') }}
          </v-card-title>
          <v-card-text>
            {{ t('about.walletsBody') }}
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="h-100">
          <v-card-title class="d-flex align-center about-card__title">
            <span class="kf-icon-tile mr-3"><v-icon size="20">mdi-sync</v-icon></span>
            {{ t('nav.recurring') }}
          </v-card-title>
          <v-card-text>
            {{ t('about.recurringBody') }}
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="h-100">
          <v-card-title class="d-flex align-center about-card__title">
            <span class="kf-icon-tile mr-3"><v-icon size="20">mdi-file-chart</v-icon></span>
            {{ t('nav.reports') }}
          </v-card-title>
          <v-card-text>
            {{ t('about.reportsBody') }}
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="mt-4 kf-card-hero">
      <v-card-title class="d-flex align-center about-card__title">
        <span class="kf-icon-tile kf-icon-tile--gold mr-3"><v-icon size="20">mdi-star-four-points-outline</v-icon></span>
        <span class="text-h6 font-weight-bold">{{ t('about.aiPowered') }}</span>
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
import flowBanner from '@/assets/branding/knexura-flow-banner.webp'
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
</script>

<style scoped>
.about-hero {
  overflow: hidden;
  padding: 0 !important;
}

.about-hero__banner {
  display: block;
  width: 100%;
  height: auto;
}

.about-card__title {
  padding: 18px 18px 6px !important;
  white-space: normal;
}

.about-hero + .v-card p,
.v-row .v-card-text {
  color: var(--kf-text-secondary);
}
</style>
