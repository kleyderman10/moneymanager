import { computed, toValue } from 'vue'
import { useI18n } from 'vue-i18n'

// Single source of truth for the app's destinations: the drawer renders it as sections and the
// quick-navigation palette (Ctrl+K) searches it.
export const useNavSections = (isAdmin) => {
  const { t } = useI18n()
  return computed(() => [
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
    ...(toValue(isAdmin) ? [{
      key: 'admin',
      title: t('nav.adminSection'),
      items: [{ to: '/admin', icon: 'mdi-shield-account-outline', title: t('nav.admin') }],
    }] : []),
  ])
}
