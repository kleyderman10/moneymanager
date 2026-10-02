<template>
  <nav class="kf-bottom-nav" :aria-label="t('nav.mainNavigation')" data-tour="nav-bottom">
    <router-link
      v-for="item in leftItems"
      :key="item.key"
      :to="item.to"
      class="kf-bottom-nav__item"
      :class="{ 'kf-bottom-nav__item--active': active === item.key }"
      :aria-current="active === item.key ? 'page' : undefined"
      :data-tour="item.tour"
    >
      <v-icon size="24">{{ item.icon }}</v-icon>
      <span>{{ item.label }}</span>
    </router-link>

    <div class="kf-bottom-nav__voice">
      <VoiceActionButton variant="nav" @voice-click="$emit('voice-click')" />
    </div>

    <router-link
      :to="reports.to"
      class="kf-bottom-nav__item"
      :class="{ 'kf-bottom-nav__item--active': active === reports.key }"
      :aria-current="active === reports.key ? 'page' : undefined"
    >
      <v-icon size="24">{{ reports.icon }}</v-icon>
      <span>{{ reports.label }}</span>
    </router-link>

    <button
      type="button"
      class="kf-bottom-nav__item"
      :class="{ 'kf-bottom-nav__item--active': active === 'more' }"
      :aria-expanded="menuOpen"
      data-tour="nav-menu"
      @click="$emit('menu-click')"
    >
      <v-icon size="24">mdi-menu</v-icon>
      <span>{{ t('nav.menu') }}</span>
    </button>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import VoiceActionButton from './VoiceActionButton.vue'

// Mobile navigation: Inicio · Movimientos · [Hablar] · Reportes · Menú.
// The voice button only emits voice-click; MainLayout owns the assistant and the drawer.
defineProps({ menuOpen: { type: Boolean, default: false } })
defineEmits(['voice-click', 'menu-click'])

const { t } = useI18n()
const route = useRoute()

const leftItems = computed(() => [
  { key: 'dashboard', to: '/', icon: 'mdi-home-outline', label: t('nav.dashboard') },
  { key: 'transactions', to: '/transactions', icon: 'mdi-swap-vertical', label: t('nav.transactions'), tour: 'nav-transactions' },
])
const reports = computed(() => ({ key: 'reports', to: '/reports', icon: 'mdi-chart-bar', label: t('nav.reports') }))

const active = computed(() => {
  const segment = route.path.split('/')[1] || 'dashboard'
  return ['dashboard', 'transactions', 'reports'].includes(segment) ? segment : 'more'
})
</script>

<style scoped>
.kf-bottom-nav {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1004;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: end;
  height: calc(var(--kf-nav-height) + var(--safe-bottom, 0px));
  padding: 0 6px var(--safe-bottom, 0px);
  border-top: 1px solid var(--kf-border-subtle);
  background: rgba(8, 31, 43, 0.97);
  box-shadow: 0 -12px 32px rgba(0, 0, 0, 0.28);
}

/* Some iOS WKWebView builds under-report the bottom safe area; bleed the bar's color
   below its edge so no sliver of page shows under it. */
.kf-bottom-nav::after {
  position: absolute;
  right: 0;
  bottom: -40px;
  left: 0;
  height: 40px;
  background: inherit;
  content: '';
  pointer-events: none;
}

.kf-bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 0;
  height: var(--kf-nav-height);
  border: 0;
  background: transparent;
  color: var(--kf-text-secondary);
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: color var(--kf-motion) var(--kf-ease);
  -webkit-tap-highlight-color: transparent;
}

.kf-bottom-nav__item span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kf-bottom-nav__item--active {
  position: relative;
  color: var(--kf-primary);
}

.kf-bottom-nav__item--active::before {
  position: absolute;
  top: 0;
  width: 26px;
  height: 3px;
  border-radius: 0 0 4px 4px;
  background: var(--kf-primary);
  box-shadow: 0 0 12px rgba(0, 229, 208, 0.6);
  content: '';
}

.kf-bottom-nav__item:focus-visible {
  outline: 2px solid var(--kf-primary);
  outline-offset: -4px;
  border-radius: 12px;
}

.kf-bottom-nav__voice {
  display: flex;
  justify-content: center;
  height: var(--kf-nav-height);
  align-items: flex-end;
  padding-bottom: 6px;
}
</style>
