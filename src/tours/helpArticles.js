// Help center articles, one per module. Text lives in i18n under `help.articles.<id>`
// (title, summary and a `steps` list); `tour` is the guided tour replayed from the article.
export const HELP_ARTICLES = [
  { id: 'dashboard', icon: 'mdi-view-dashboard-outline', to: '/', tour: 'welcome' },
  { id: 'transactions', icon: 'mdi-swap-vertical', to: '/transactions', tour: 'transactions' },
  { id: 'wallets', icon: 'mdi-wallet-outline', to: '/wallets', tour: 'wallets' },
  { id: 'budgets', icon: 'mdi-chart-pie-outline', to: '/budgets', tour: 'budgets' },
  { id: 'goals', icon: 'mdi-target', to: '/goals', tour: 'goals' },
  { id: 'credits', icon: 'mdi-bank-minus', to: '/credits', tour: 'credits' },
  { id: 'recurring', icon: 'mdi-sync', to: '/recurring', tour: 'recurring' },
  { id: 'categories', icon: 'mdi-shape-outline', to: '/categories', tour: 'categories' },
  { id: 'simulators', icon: 'mdi-calculator-variant-outline', to: '/simulators?tab=capacity', tour: 'simulators' },
  { id: 'reports', icon: 'mdi-chart-donut', to: '/reports', tour: 'reports' },
  { id: 'profile', icon: 'mdi-account-outline', to: '/profile', tour: 'profile' },
]

// Suggested order for a brand-new account.
export const FIRST_STEPS = [
  { id: 'wallet', icon: 'mdi-wallet-plus-outline', to: '/wallets' },
  { id: 'transaction', icon: 'mdi-plus-circle-outline', to: '/transactions?create=1' },
  { id: 'budget', icon: 'mdi-chart-pie-outline', to: '/budgets' },
  { id: 'goal', icon: 'mdi-flag-checkered', to: '/goals' },
]

export const FAQ_IDS = ['ai', 'privacy', 'trial', 'readOnly', 'security', 'export', 'currency', 'bank']
