<template>
  <AIChatPanel v-if="!billingStore.requiresSubscription && authStore.hasAcceptedAIConsent" />
  <AIConsentDialog :visible="showAIConsent" @decline="dismissAIConsent" @accept="dismissAIConsent" />

  <v-navigation-drawer
    v-model="drawer"
    app
    :temporary="isMobile"
    :permanent="!isMobile"
    :width="272"
    class="finance-sidebar"
  >
    <template #prepend>
      <div class="finance-brand">
        <img src="/icon.svg" alt="" aria-hidden="true" class="finance-brand__logo" />
        <div>
          <div class="finance-brand__name">{{ t('layout.brandName') }}</div>
          <div class="finance-brand__tagline">{{ t('layout.brandTagline') }}</div>
        </div>
      </div>
    </template>

    <v-list nav density="comfortable">
      <v-list-subheader>{{ t('nav.overview') }}</v-list-subheader>
      <v-list-item prepend-icon="mdi-view-dashboard-outline" :title="t('nav.dashboard')" value="dashboard" to="/" exact />
      <v-list-item prepend-icon="mdi-swap-vertical" :title="t('nav.transactions')" value="transactions" to="/transactions" />
      <v-list-item prepend-icon="mdi-chart-donut" :title="t('nav.reports')" value="reports" to="/reports" />

      <v-list-subheader class="mt-3">{{ t('nav.planning') }}</v-list-subheader>
      <v-list-item prepend-icon="mdi-wallet-outline" :title="t('nav.wallets')" value="wallets" to="/wallets" />
      <v-list-item prepend-icon="mdi-bank-minus" :title="t('nav.credits')" value="credits" to="/credits" />
      <v-list-item prepend-icon="mdi-chart-pie-outline" :title="t('nav.budgets')" value="budgets" to="/budgets" />
      <v-list-item prepend-icon="mdi-target" :title="t('nav.goals')" value="goals" to="/goals" />
      <v-list-item prepend-icon="mdi-calculator-variant-outline" :title="t('nav.simulators')" value="simulators" to="/simulators?tab=capacity" />
      <v-list-item prepend-icon="mdi-sync" :title="t('nav.recurring')" value="recurring" to="/recurring" />
      <v-list-item prepend-icon="mdi-shape-outline" :title="t('nav.categories')" value="categories" to="/categories" />

      <v-list-subheader class="mt-3">{{ t('nav.account') }}</v-list-subheader>
      <v-list-item prepend-icon="mdi-account-outline" :title="t('nav.profile')" value="profile" to="/profile" />
      <v-list-item prepend-icon="mdi-credit-card-outline" :title="t('nav.subscription')" value="subscription" to="/subscription" />
      <v-list-item prepend-icon="mdi-information-outline" :title="t('nav.about')" value="about" to="/about" />

      <template v-if="authStore.isAdmin">
        <v-list-subheader class="mt-3">{{ t('nav.adminSection') }}</v-list-subheader>
        <v-list-item prepend-icon="mdi-shield-account-outline" :title="t('nav.admin')" value="admin" to="/admin" />
      </template>
    </v-list>

    <template #append>
      <div class="finance-sidebar__footer d-flex align-center ga-3">
        <v-avatar size="34" class="finance-avatar">{{ initials }}</v-avatar>
        <div class="finance-sidebar__user flex-grow-1">
          <strong>{{ authStore.user?.name || t('layout.myAccount') }}</strong>
          <span>{{ authStore.user?.email || t('layout.personalFinance') }}</span>
        </div>
        <v-btn icon="mdi-logout" size="x-small" variant="text" :title="t('layout.logout')" @click="handleLogout" />
      </div>
    </template>
  </v-navigation-drawer>

  <v-app-bar app :height="64 + safeAreaTop" class="finance-topbar" :elevation="isMobile ? 1 : 0">
    <template v-if="!isMobile">
      <div class="ml-4">
        <div class="topbar-greeting">{{ greeting }}{{ firstName ? `, ${firstName}` : '' }}</div>
        <div class="topbar-date">{{ currentDate }}</div>
      </div>
    </template>
    
    <template v-else>
      <div class="mobile-app-title d-flex w-100 justify-center align-center">
        <span class="font-weight-bold text-subtitle-1">{{ currentRouteTitle }}</span>
      </div>
    </template>

    <v-spacer v-if="!isMobile" />

    <v-btn
      class="topbar-profile"
      :class="{ 'mr-2': true, 'px-0': isMobile }"
      :variant="isMobile ? 'text' : 'flat'"
      to="/profile"
      :aria-label="t('layout.openProfile')"
      :icon="isMobile"
    >
      <v-avatar size="31" class="finance-avatar" :class="{ 'mr-sm-2': !isMobile }">{{ initials }}</v-avatar>
      <span v-if="!isMobile" class="topbar-profile__name">{{ firstName || t('layout.profile') }}</span>
      <v-icon v-if="!isMobile" size="17" class="ml-1">mdi-chevron-down</v-icon>
    </v-btn>
  </v-app-bar>

  <v-main class="finance-main">
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
      <router-view />
    </v-container>
  </v-main>

  <v-bottom-navigation
    v-if="isMobile"
    v-model="bottomNav"
    app
    grow
    class="finance-bottom-nav"
  >
    <v-btn value="dashboard" to="/" exact>
      <v-icon>mdi-view-dashboard-outline</v-icon>
      <span>{{ t('nav.dashboard') }}</span>
    </v-btn>
    <v-btn value="transactions" to="/transactions">
      <v-icon>mdi-swap-vertical</v-icon>
      <span>{{ t('nav.transactions') }}</span>
    </v-btn>
    <v-btn value="wallets" to="/wallets">
      <v-icon>mdi-wallet-outline</v-icon>
      <span>{{ t('nav.wallets') }}</span>
    </v-btn>
    <v-btn value="reports" to="/reports">
      <v-icon>mdi-chart-donut</v-icon>
      <span>{{ t('nav.reports') }}</span>
    </v-btn>
    <v-btn value="more" @click.prevent="drawer = !drawer">
      <v-icon>mdi-menu</v-icon>
      <span>{{ t('nav.menu') }}</span>
    </v-btn>
  </v-bottom-navigation>
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

const { t } = useI18n()
const { money, dateLong } = useLocale()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)

const drawer = ref(!mobile.value)

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
const bottomNav = ref('dashboard')

// Shown once right after login/registration so the user can decide before any AI
// feature (scan, statement import, chat, suggestions) is reachable. If declined, it
// won't be shown again automatically this session — the user can reopen it from
// "Mi perfil" — but AI-powered entry points stay disabled until they accept.
const showAIConsent = computed(() => (
  authStore.isAuthenticated && !authStore.hasAcceptedAIConsent && !authStore.aiConsentDismissed
))
const dismissAIConsent = () => authStore.dismissAIConsent()

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

watch(() => route.path, (path) => {
  const segment = path.split('/')[1] || 'dashboard'
  const visibleTabs = ['dashboard', 'transactions', 'wallets', 'reports']
  bottomNav.value = visibleTabs.includes(segment) ? segment : 'more'
}, { immediate: true })

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
  if (!authStore.user && localStorage.getItem('accessToken')) authStore.fetchProfile()
  await billingStore.fetchStatus(true)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', readSafeAreaTop)
  window.removeEventListener('billing:read-only', handleReadOnlyStatus)
})
</script>
