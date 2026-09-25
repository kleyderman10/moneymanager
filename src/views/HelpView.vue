<template>
  <div>
    <div class="page-intro">
      <div class="page-intro__eyebrow">{{ t('help.eyebrow') }}</div>
      <h1 :class="isMobile ? 'text-h5' : 'text-h4'">{{ t('help.title') }}</h1>
      <p class="page-intro__subtitle">{{ t('help.subtitle') }}</p>
    </div>

    <v-text-field
      v-model="query"
      :placeholder="t('help.searchPlaceholder')"
      prepend-inner-icon="mdi-magnify"
      variant="solo"
      flat
      clearable
      hide-details
      class="help-search mb-5"
    />

    <v-card v-if="!query" class="section-card mb-5">
      <v-card-title class="d-flex align-center">
        <span class="section-icon mr-3"><v-icon size="20">mdi-rocket-launch-outline</v-icon></span>
        <div>
          <div class="text-body-1">{{ t('help.firstStepsTitle') }}</div>
          <div class="text-caption text-medium-emphasis font-weight-regular">{{ t('help.firstStepsSubtitle') }}</div>
        </div>
      </v-card-title>
      <v-card-text class="pa-3 pa-md-4">
        <div class="help-first-steps">
          <router-link v-for="(step, index) in FIRST_STEPS" :key="step.id" :to="step.to" class="help-first-step">
            <span class="help-first-step__number">{{ index + 1 }}</span>
            <span>
              <strong>{{ t(`help.firstSteps.${step.id}.title`) }}</strong>
              <span>{{ t(`help.firstSteps.${step.id}.body`) }}</span>
            </span>
            <v-icon size="18" class="ml-auto">mdi-chevron-right</v-icon>
          </router-link>
        </div>
      </v-card-text>
    </v-card>

    <h2 class="help-heading">{{ t('help.guidesTitle') }}</h2>
    <v-expansion-panels v-if="filteredArticles.length" v-model="openArticles" multiple class="mb-6">
      <v-expansion-panel v-for="article in filteredArticles" :id="`help-${article.id}`" :key="article.id" :value="article.id">
        <v-expansion-panel-title>
          <div class="d-flex align-center ga-3">
            <span class="section-icon"><v-icon size="20">{{ article.icon }}</v-icon></span>
            <div>
              <div class="font-weight-bold">{{ article.title }}</div>
              <div class="text-caption text-medium-emphasis">{{ article.summary }}</div>
            </div>
          </div>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <ol class="help-steps">
            <li v-for="(step, index) in article.steps" :key="index">{{ step }}</li>
          </ol>
          <div class="d-flex flex-wrap ga-2 mt-4">
            <v-btn color="primary" prepend-icon="mdi-map-marker-path" @click="startGuidedTour(article)">
              {{ t('help.startTour') }}
            </v-btn>
            <v-btn variant="text" append-icon="mdi-arrow-right" :to="article.to">{{ t('help.goToScreen') }}</v-btn>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <h2 class="help-heading">{{ t('help.faqTitle') }}</h2>
    <v-expansion-panels v-if="filteredFaq.length" class="mb-6">
      <v-expansion-panel v-for="item in filteredFaq" :key="item.id" :title="item.q">
        <v-expansion-panel-text class="text-body-2">{{ item.a }}</v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <v-card v-if="query && !filteredArticles.length && !filteredFaq.length" class="pa-8 text-center text-grey mb-6">
      <v-icon size="40">mdi-text-search</v-icon>
      <div class="mt-2">{{ t('help.noResults') }}</div>
    </v-card>

    <v-card v-if="!query" class="section-card">
      <v-card-text class="d-flex flex-column flex-sm-row align-start align-sm-center ga-3 pa-5">
        <span class="section-icon"><v-icon size="20">mdi-restart</v-icon></span>
        <div class="flex-grow-1">
          <div class="font-weight-bold">{{ t('help.resetTitle') }}</div>
          <div class="text-body-2 text-medium-emphasis">{{ t('help.resetBody') }}</div>
        </div>
        <v-btn variant="outlined" :loading="resetting" @click="resetGuides">{{ t('help.resetButton') }}</v-btn>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import { useAuthStore } from '@/stores/auth'
import { useSnackbar } from '@/stores/snackbar'
import { useTour } from '@/composables/useTour'
import { HELP_ARTICLES, FIRST_STEPS, FAQ_IDS } from '@/tours/helpArticles'

const { t, tm, rt } = useI18n()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const snackbar = useSnackbar()
const { scheduleTour } = useTour()

const query = ref('')
const openArticles = ref([])
const resetting = ref(false)

// Accent- and case-insensitive, so "credito" finds "Crédito".
const normalize = (text) => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const matches = (...texts) => {
  const q = normalize(query.value).trim()
  return !q || texts.some((text) => normalize(text).includes(q))
}

const articles = computed(() => HELP_ARTICLES.map((article) => ({
  ...article,
  title: t(`help.articles.${article.id}.title`),
  summary: t(`help.articles.${article.id}.summary`),
  steps: tm(`help.articles.${article.id}.steps`).map((step) => rt(step)),
})))

const filteredArticles = computed(() => articles.value.filter((a) => matches(a.title, a.summary, ...a.steps)))

const filteredFaq = computed(() => FAQ_IDS
  .map((id) => ({ id, q: t(`help.faq.${id}.q`), a: t(`help.faq.${id}.a`) }))
  .filter((item) => matches(item.q, item.a)))

const startGuidedTour = async (article) => {
  await router.push(article.to)
  scheduleTour(article.tour, { force: true })
}

const resetGuides = async () => {
  resetting.value = true
  const result = await authStore.resetTours()
  resetting.value = false
  if (result.success) snackbar.success(t('help.resetDone'))
  else snackbar.error(result.message)
}

// /help#transactions opens that module's guide, e.g. from an empty state's "how do I start?".
onMounted(async () => {
  const id = route.hash.replace('#', '')
  if (!HELP_ARTICLES.some((article) => article.id === id)) return
  openArticles.value = [id]
  await nextTick()
  document.getElementById(`help-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})
</script>

<style scoped>
.help-search :deep(.v-field) {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
}

.help-heading {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 12px;
}

.help-first-steps {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.help-first-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.help-first-step:hover,
.help-first-step:focus-visible {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.04);
}

.help-first-step strong,
.help-first-step span > span {
  display: block;
}

.help-first-step span > span {
  font-size: 0.8rem;
  opacity: 0.7;
}

.help-first-step__number {
  display: grid;
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 50%;
  font-size: 0.85rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-primary));
  background: rgb(var(--v-theme-primary));
}

.help-steps {
  padding-left: 20px;
  line-height: 1.6;
}

.help-steps li + li {
  margin-top: 6px;
}
</style>
