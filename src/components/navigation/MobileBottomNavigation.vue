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
  right: 10px;
  bottom: calc(var(--safe-bottom, 0px) + 8px);
  left: 10px;
  z-index: 1004;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: center;
  height: var(--kf-nav-height);
  padding: 0 6px;
  border: 1px solid rgba(34, 211, 197, 0.28);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(12, 44, 58, 0.96), rgba(6, 28, 39, 0.98));
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45), 0 0 18px rgba(34, 211, 197, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
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

@media (max-width: 359px) {
  .kf-bottom-nav__item {
    font-size: 10px;
    letter-spacing: -0.02em;
  }
}

.kf-bottom-nav__item--active { color: var(--kf-primary); }
.kf-bottom-nav__item--active .v-icon { filter: drop-shadow(0 0 8px rgba(34, 211, 197, 0.75)); }

.kf-bottom-nav__item:focus-visible {
  outline: 2px solid var(--kf-primary);
  outline-offset: -4px;
  border-radius: 18px;
}

.kf-bottom-nav__voice {
  display: flex;
  justify-content: center;
  height: var(--kf-nav-height);
  align-items: center;
}
</style>
