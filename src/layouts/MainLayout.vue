<template>
  <AIChatPanel v-if="!billingStore.requiresSubscription && authStore.hasAcceptedAIConsent" />
  <AIConsentDialog :visible="showAIConsent || assistantConsentRequested" @decline="onConsentDecline" @accept="onConsentAccept" />
  <AssistantSheet />
  <QuickNav v-model="quickNavOpen" :is-admin="authStore.isStaff" />

  <AppDrawer
    v-model="drawer"
    :mobile="isMobile"
    :rail="sidebarCollapsed"
    :user="authStore.user"
    :is-admin="authStore.isStaff"
    @logout="handleLogout"
  />

  <v-app-bar app :height="64 + safeAreaTop" class="finance-topbar kf-topbar" :elevation="0">
    <!-- Desktop: rail toggle, greeting, voice, help and profile. -->
    <template v-if="!isMobile">
      <v-btn :icon="sidebarCollapsed ? 'mdi-menu' : 'mdi-menu-open'" :aria-label="t('layout.toggleNavigation')" :aria-expanded="!sidebarCollapsed" variant="text" @click="sidebarCollapsed = !sidebarCollapsed" />
      <div class="ml-3">
        <div class="topbar-greeting">{{ greeting }}{{ firstName ? `, ${firstName}` : '' }}</div>
        <div class="topbar-date">{{ currentDate }}</div>
      </div>
      <v-spacer />
      <v-btn icon="mdi-magnify" variant="text" class="mr-1" :aria-label="t('layout.quickNav')" :title="t('layout.quickNav') + ' (Ctrl+K)'" @click="quickNavOpen = true" />
      <VoiceActionButton variant="compact" class="mr-3" @voice-click="openAssistant" />
    </template>

    <!-- Mobile: back (or avatar on the main tabs), centered title, help. The voice action
         lives in the bottom navigation. -->
    <template v-else>
      <v-btn
        v-if="isRootTab"
        class="kf-topbar__lead ml-2"
        variant="text"
        icon
        to="/profile"
        :aria-label="t('layout.openProfile')"
      >
        <v-avatar size="36" class="kf-avatar">{{ initials }}</v-avatar>
      </v-btn>
      <v-btn
        v-else
        class="kf-topbar__lead ml-2"
        icon="mdi-arrow-left"
        variant="tonal"
        :aria-label="t('common.back')"
        @click="goBack"
      />
      <div class="mobile-app-title kf-topbar__title">
        <span>{{ currentRouteTitle }}</span>
      </div>
      <v-spacer />
    </template>

    <v-menu location="bottom end">
      <template #activator="{ props: menuProps }">
        <v-btn
          v-bind="menuProps"
          icon="mdi-help-circle-outline"
          variant="text"
          :class="isMobile ? 'mr-2' : 'mr-1'"
          data-tour="topbar-help"
          :aria-label="t('help.menuLabel')"
        />
      </template>
      <v-list density="comfortable" min-width="240">
        <v-list-item
          v-if="currentTourId"
          prepend-icon="mdi-map-marker-path"
          :title="t('help.screenGuide')"
          @click="startTour(currentTourId, { force: true })"
        />
        <v-list-item
          v-if="currentTourId !== 'welcome'"
          prepend-icon="mdi-compass-outline"
          :title="t('help.replayWelcome')"
          @click="replayWelcome"
        />
        <v-list-item prepend-icon="mdi-lifebuoy" :title="t('help.center')" to="/help" />
      </v-list>
    </v-menu>

    <v-btn
      v-if="!isMobile"
      class="topbar-profile mr-4"
      variant="flat"
      to="/profile"
      :aria-label="t('layout.openProfile')"
    >
      <v-avatar size="31" class="kf-avatar mr-2">{{ initials }}</v-avatar>
      <span class="topbar-profile__name">{{ firstName || t('layout.profile') }}</span>
      <v-icon size="17" class="ml-1">mdi-chevron-down</v-icon>
    </v-btn>
  </v-app-bar>

  <v-main class="finance-main" :class="{ 'finance-main--with-nav': isMobile }">
    <v-container fluid class="finance-content">
      <v-alert
        v-if="showReadOnlyBanner"
        type="error"
        variant="tonal"
        density="comfortable"
        icon="mdi-lock-outline"
        class="mb-5"
      >
        <strong>{{ t('layout.trialEnded') }}</strong>
        <span class="d-block text-body-2 mt-1">
          {{ t('layout.trialEndedBody') }}
        </span>
        <template #append>
          <v-btn variant="text" color="error" to="/subscription">{{ t('layout.activateSubscription') }}</v-btn>
        </template>
      </v-alert>
      <v-alert
        v-else-if="showTrialBanner"
        type="info"
        variant="tonal"
        density="comfortable"
        icon="mdi-clock-outline"
        class="mb-5"
        closable
      >
        <strong>{{ trialBannerTitle }}</strong>
        <span class="d-block text-body-2 mt-1">{{ t('layout.trialContinueAfter', { price: formattedPlanPrice }) }}</span>
        <template #append>
          <v-btn variant="text" color="primary" to="/subscription">{{ t('layout.viewMyPlan') }}</v-btn>
        </template>
      </v-alert>
      <!-- Remounting on dataVersion makes the current view reload its data after the assistant
           saves something, using its own filters. -->
      <router-view v-slot="{ Component }">
        <component :is="Component" :key="assistantStore.dataVersion" />
      </router-view>
    </v-container>
  </v-main>

  <MobileBottomNavigation
    v-if="isMobile"
    :menu-open="drawer"
    @voice-click="openAssistant"
    @menu-click="drawer = !drawer"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { useLocale } from '@/composables/useLocale'
import { useDisplay } from 'vuetify'
import AIChatPanel from '@/components/AIChatPanel.vue'
import AIConsentDialog from '@/components/AIConsentDialog.vue'
import AssistantSheet from '@/components/assistant/AssistantSheet.vue'
import AppDrawer from '@/components/navigation/AppDrawer.vue'
import QuickNav from '@/components/navigation/QuickNav.vue'
import MobileBottomNavigation from '@/components/navigation/MobileBottomNavigation.vue'
import VoiceActionButton from '@/components/navigation/VoiceActionButton.vue'
import { useAssistantStore } from '@/stores/assistant'
import { useTour } from '@/composables/useTour'
import { TOUR_BY_ROUTE } from '@/tours/definitions'

const { t } = useI18n()
const { money, dateLong } = useLocale()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)

const drawer = ref(!mobile.value)
const sidebarCollapsed = ref(false)

// Vuetify sizes the app bar (and reserves the matching space above the page content)
// from this `height` prop, not from the element's actual rendered size — so on iOS,
// where the notch/Dynamic Island's safe area only exists as a CSS env() value, it has
// to be read into a plain number and added here, or the bar (and its profile/menu
// icons) end up drawn underneath the status bar, unreachable.
//
// Read via a throwaway element's computed `padding-top` rather than
// getComputedStyle(...).getPropertyValue('--safe-top'): browsers only guarantee
// env()/var() substitution when it's used directly on a real CSS property, not when
// reading back a custom property's own value, which can come back as the literal,
// unresolved "env(...)" string.
const safeAreaTop = ref(0)
const readSafeAreaTop = () => {
  const probe = document.createElement('div')
  probe.style.cssText = 'position: fixed; top: 0; height: 0; padding-top: env(safe-area-inset-top, 0px); visibility: hidden; pointer-events: none;'
  document.body.appendChild(probe)
  safeAreaTop.value = parseInt(getComputedStyle(probe).paddingTop) || 0
  probe.remove()
}
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const billingStore = useSubscriptionStore()

// Shown once right after login/registration so the user can decide before any AI
// feature (scan, statement import, chat, suggestions) is reachable. If declined, it
// won't be shown again automatically this session — the user can reopen it from
// "Mi perfil" — but AI-powered entry points stay disabled until they accept.
const showAIConsent = computed(() => (
  authStore.isAuthenticated && !authStore.hasAcceptedAIConsent && !authStore.aiConsentDismissed
))
const dismissAIConsent = () => authStore.dismissAIConsent()

// Global assistant: available to every user once they accept the AI consent. Without it,
// the button opens the consent dialog first and the assistant right after accepting.
const assistantStore = useAssistantStore()
const assistantConsentRequested = ref(false)
const openAssistant = () => {
  if (!authStore.hasAcceptedAIConsent) {
    assistantConsentRequested.value = true
    return
  }
  assistantStore.open()
}
const onConsentAccept = () => {
  dismissAIConsent()
  if (assistantConsentRequested.value) {
    assistantConsentRequested.value = false
    assistantStore.open()
  }
}
const onConsentDecline = () => {
  dismissAIConsent()
  assistantConsentRequested.value = false
}
const quickNavOpen = ref(false)
const handleAssistantShortcut = (event) => {
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    quickNavOpen.value = !quickNavOpen.value
    return
  }
  if (event.ctrlKey && event.shiftKey && event.code === 'Space') {
    event.preventDefault()
    openAssistant()
  }
}

// Guided tours: the welcome tour on the dashboard, then one per screen on its first visit.
// They wait for the AI consent decision and the billing status, so they never open on top
// of the consent dialog or of a screen the subscription gate is about to redirect away from.
const { startTour, scheduleTour, stopTour, maybeStartTour, activeTourRoute } = useTour()
const currentTourId = computed(() => TOUR_BY_ROUTE[route.name] || null)
const toursReady = computed(() => (
  Boolean(authStore.user) && !showAIConsent.value && Boolean(billingStore.status)
))

watch(
  [currentTourId, toursReady, () => authStore.user?.completedTours?.length],
  ([id, ready]) => { if (id && ready) maybeStartTour(id) },
  { immediate: true },
)

watch(() => route.name, (name) => {
  const tourRoute = activeTourRoute()
  if (tourRoute && tourRoute !== name) stopTour()
})

const replayWelcome = async () => {
  if (route.name !== 'Dashboard') await router.push('/')
  scheduleTour('welcome', { force: true })
}

const firstName = computed(() => authStore.user?.name?.trim().split(' ')[0] || '')
const initials = computed(() => {
  const name = authStore.user?.name?.trim()
  if (!name) return 'KF'
  return name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return t('layout.goodMorning')
  if (hour < 18) return t('layout.goodAfternoon')
  return t('layout.goodEvening')
})

const currentDate = computed(() => dateLong(new Date(), {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}))

const currentRouteTitle = computed(() => {
  const map = {
    Dashboard: t('nav.dashboard'),
    Transactions: t('nav.transactions'),
    Categories: t('nav.categories'),
    Budgets: t('nav.budgets'),
    Goals: t('nav.goals'),
    Wallets: t('nav.wallets'),
    Credits: t('nav.credits'),
    Recurring: t('nav.recurring'),
    Reports: t('nav.reports'),
    Simulators: t('nav.simulators'),
    Profile: t('nav.profile'),
    Subscription: t('nav.subscription'),
    About: t('nav.about'),
    Help: t('nav.help'),
    Admin: t('nav.admin'),
  }
  if (route.name === 'Simulators' && route.query.tab === 'capacity') return t('layout.creditCapacity')
  return map[route.name] || t('layout.brandName')
})

const showTrialBanner = computed(() => (
  billingStore.showTrialNotice && route.name !== 'Subscription'
))
const showReadOnlyBanner = computed(() => (
  billingStore.isReadOnly && route.name !== 'Subscription'
))
const trialBannerTitle = computed(() => {
  const days = billingStore.status?.daysRemaining || 0
  return days === 1 ? t('layout.trialDaysLeftOne') : t('layout.trialDaysLeft', { days })
})
const formattedPlanPrice = computed(() => money(
  billingStore.status?.plan?.amount || 15000,
  billingStore.status?.plan?.currency || undefined,
))

// The main tabs show the avatar in the mobile header; every other screen shows "back".
const ROOT_TABS = ['Dashboard', 'Transactions', 'Reports']
const isRootTab = computed(() => ROOT_TABS.includes(route.name))
const goBack = () => {
  if (window.history.state?.back) router.back()
  else router.push('/')
}

watch(mobile, (value) => { drawer.value = !value })

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

const handleReadOnlyStatus = (event) => billingStore.setStatus(event.detail)

onMounted(async () => {
  readSafeAreaTop()
  // Rotating the device swaps which edge has the notch/Dynamic Island inset.
  window.addEventListener('resize', readSafeAreaTop)
  window.addEventListener('billing:read-only', handleReadOnlyStatus)
  window.addEventListener('keydown', handleAssistantShortcut)
  if (!authStore.user && localStorage.getItem('accessToken')) authStore.fetchProfile()
  await billingStore.fetchStatus(true)
  assistantStore.fetchInsights()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', readSafeAreaTop)
  window.removeEventListener('billing:read-only', handleReadOnlyStatus)
  window.removeEventListener('keydown', handleAssistantShortcut)
})
</script>
