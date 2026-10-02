<template>
  <v-navigation-drawer
    :model-value="modelValue"
    app
    :temporary="mobile"
    :permanent="!mobile"
    :width="292"
    :rail="!mobile && rail"
    class="kf-drawer"
    :class="{ 'kf-drawer--rail': !mobile && rail }"
    data-tour="nav-sidebar"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #prepend>
      <div class="kf-drawer__brand">
        <img :src="brandIcon" alt="" aria-hidden="true" class="kf-drawer__logo" />
        <div class="kf-drawer__brand-copy">
          <div class="kf-drawer__name">Knexura <span>Flow</span></div>
          <div class="kf-drawer__tagline">{{ t('layout.brandTagline') }}</div>
        </div>
        <v-btn
          v-if="mobile"
          icon="mdi-close"
          variant="tonal"
          size="small"
          class="kf-drawer__close"
          :aria-label="t('assistant.close')"
          @click="$emit('update:modelValue', false)"
        />
      </div>
    </template>

    <v-list nav density="comfortable" class="kf-drawer__list">
      <template v-for="section in sections" :key="section.key">
        <v-list-subheader :data-tour="section.tour">{{ section.title }}</v-list-subheader>
        <v-list-item
          v-for="item in section.items"
          :key="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          :to="item.to"
          :exact="item.exact"
          :data-tour="item.tour"
          :append-icon="mobile ? 'mdi-chevron-right' : undefined"
          @click="mobile && $emit('update:modelValue', false)"
        />
      </template>
    </v-list>

    <template #append>
      <div class="kf-drawer__user">
        <v-avatar size="40" class="kf-avatar">{{ initials }}</v-avatar>
        <div class="kf-drawer__user-copy">
          <strong>{{ user?.name || t('layout.myAccount') }}</strong>
          <span>{{ user?.email || t('layout.personalFinance') }}</span>
        </div>
        <v-btn icon="mdi-logout" size="small" variant="text" :aria-label="t('layout.logout')" :title="t('layout.logout')" @click="$emit('logout')" />
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
const brandIcon = '/knexura-flow-icon.webp'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mobile: { type: Boolean, default: false },
  rail: { type: Boolean, default: false },
  user: { type: Object, default: null },
  isAdmin: { type: Boolean, default: false },
})
defineEmits(['update:modelValue', 'logout'])

const { t } = useI18n()

const initials = computed(() => {
  const name = props.user?.name?.trim()
  if (!name) return 'KF'
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
})

const sections = computed(() => [
  {
    key: 'overview',
    title: t('nav.overview'),
    items: [
      { to: '/', icon: 'mdi-home-outline', title: t('nav.dashboard'), exact: true },
      { to: '/transactions', icon: 'mdi-swap-vertical', title: t('nav.transactions') },
      { to: '/reports', icon: 'mdi-chart-bar', title: t('nav.reports') },
    ],
  },
  {
    key: 'planning',
    title: t('nav.planning'),
    tour: 'nav-planning',
    items: [
      { to: '/wallets', icon: 'mdi-wallet-outline', title: t('nav.wallets'), tour: 'nav-wallets' },
      { to: '/credits', icon: 'mdi-bank', title: t('nav.credits') },
      { to: '/budgets', icon: 'mdi-chart-pie', title: t('nav.budgets') },
      { to: '/goals', icon: 'mdi-target', title: t('nav.goals') },
      { to: '/simulators?tab=capacity', icon: 'mdi-calculator-variant-outline', title: t('nav.simulators') },
      { to: '/recurring', icon: 'mdi-autorenew', title: t('nav.recurring') },
      { to: '/categories', icon: 'mdi-shape-outline', title: t('nav.categories') },
    ],
  },
  {
    key: 'account',
    title: t('nav.account'),
    items: [
      { to: '/profile', icon: 'mdi-account-outline', title: t('nav.profile') },
      { to: '/subscription', icon: 'mdi-credit-card-outline', title: t('nav.subscription') },
      { to: '/about', icon: 'mdi-information-outline', title: t('nav.about') },
      { to: '/help', icon: 'mdi-help-circle-outline', title: t('nav.help') },
    ],
  },
  ...(props.isAdmin ? [{
    key: 'admin',
    title: t('nav.adminSection'),
    items: [{ to: '/admin', icon: 'mdi-shield-account-outline', title: t('nav.admin') }],
  }] : []),
])
</script>

<style scoped>
.kf-drawer {
  border-right: 1px solid var(--kf-border-subtle) !important;
  background:
    linear-gradient(180deg, rgba(8, 31, 43, 0.82), rgba(8, 31, 43, 0.92)),
    url('@/assets/backgrounds/flow-bg-4.webp') center / cover no-repeat var(--kf-bg-deep) !important;
  color: var(--kf-text) !important;
}

.kf-drawer__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(20px + var(--safe-top, 0px)) 16px 12px 18px;
}

.kf-drawer__logo {
  flex: 0 0 auto;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  box-shadow: 0 0 0 1px var(--kf-border-subtle), 0 8px 24px rgba(0, 229, 208, 0.18);
}

.kf-drawer__brand-copy {
  min-width: 0;
  flex: 1 1 auto;
}

.kf-drawer__name {
  color: var(--kf-text);
  font-size: 1.12rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.kf-drawer__name span {
  color: var(--kf-primary);
}

.kf-drawer__tagline {
  margin-top: 3px;
  color: var(--kf-text-secondary);
  font-size: 0.72rem;
}

.kf-drawer__list {
  padding: 0 12px 12px;
}

.kf-drawer :deep(.v-list-subheader) {
  min-height: 36px;
  margin-top: 10px;
  padding-inline: 12px !important;
  color: var(--kf-text-secondary) !important;
  font-size: 0.66rem !important;
  font-weight: 700 !important;
  letter-spacing: 0.14em !important;
  text-transform: uppercase;
}

.kf-drawer :deep(.v-list-item) {
  min-height: 46px;
  margin-bottom: 2px;
  padding-inline: 12px !important;
  border-radius: 14px !important;
  color: var(--kf-text);
}

.kf-drawer :deep(.v-list-item-title) {
  font-size: 0.92rem;
  font-weight: 600;
  white-space: normal;
  line-height: 1.25;
}

.kf-drawer :deep(.v-list-item .v-list-item__prepend .v-icon) {
  color: var(--kf-text-secondary);
  opacity: 1;
}

.kf-drawer :deep(.v-list-item__append .v-icon) {
  color: var(--kf-text-secondary);
  font-size: 18px;
}

.kf-drawer :deep(.v-list-item--active) {
  border: 1px solid var(--kf-border);
  background: linear-gradient(90deg, rgba(0, 229, 208, 0.18), rgba(0, 229, 208, 0.04)) !important;
  color: var(--kf-text) !important;
}

.kf-drawer :deep(.v-list-item--active::before) {
  position: absolute;
  left: 0;
  width: 3px;
  height: 22px;
  border-radius: 0 4px 4px 0;
  background: var(--kf-primary);
  box-shadow: 0 0 10px rgba(0, 229, 208, 0.7);
  content: '';
  opacity: 1;
}

.kf-drawer :deep(.v-list-item--active .v-list-item__prepend .v-icon) {
  color: var(--kf-primary) !important;
}

.kf-drawer__user {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 12px calc(14px + var(--safe-bottom, 0px));
  padding: 12px;
  border: 1px solid var(--kf-border-subtle);
  border-radius: var(--kf-radius);
  background: var(--kf-gradient-card);
}

.kf-drawer__user-copy {
  min-width: 0;
  flex: 1 1 auto;
}

.kf-drawer__user-copy strong,
.kf-drawer__user-copy span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kf-drawer__user-copy strong {
  font-size: 0.86rem;
}

.kf-drawer__user-copy span {
  margin-top: 2px;
  color: var(--kf-text-secondary);
  font-size: 0.72rem;
}

/* Collapsed desktop rail: icons only. */
.kf-drawer--rail .kf-drawer__brand {
  justify-content: center;
  padding-inline: 0;
}

.kf-drawer--rail .kf-drawer__logo {
  width: 36px;
  height: 36px;
}

.kf-drawer--rail .kf-drawer__brand-copy,
.kf-drawer--rail .kf-drawer__user,
.kf-drawer--rail :deep(.v-list-subheader) {
  display: none;
}

.kf-drawer--rail .kf-drawer__list {
  padding-inline: 4px;
}
</style>
