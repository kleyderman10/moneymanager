// Guided tours. Each step's text lives in i18n under `tour.<tourId>.<step.key>.title|body`.
//
// `element` is the value of a `data-tour="..."` attribute, or `{ desktop, mobile }` when the
// anchor differs between the sidebar layout and the bottom-navigation layout. A step without
// an element (or whose element isn't on screen) is shown centered, unless it's `optional`, in
// which case it's skipped — used for anchors that only exist once there is data (a wallet to
// transfer from, a goal to add progress to…) or on one layout.
// Keep the ids in sync with TOUR_IDS in moneymanagerapi/src/services/userService.js.

export const TOURS = {
  welcome: {
    route: 'Dashboard',
    steps: [
      { key: 'intro' },
      { key: 'summary', element: 'dashboard-summary', optional: true },
      { key: 'quick', element: 'dashboard-quick', optional: true },
      { key: 'nav', element: { desktop: 'nav-sidebar', mobile: 'nav-bottom' } },
      { key: 'transactions', element: 'nav-transactions', optional: true },
      { key: 'wallets', element: 'nav-wallets', optional: true },
      { key: 'planning', element: { desktop: 'nav-planning', mobile: 'nav-menu' }, optional: true },
      { key: 'ai', element: 'ai-chat', optional: true },
      { key: 'help', element: 'topbar-help' },
    ],
  },
  transactions: {
    route: 'Transactions',
    steps: [
      { key: 'intro', element: 'page-intro' },
      { key: 'add', element: 'page-add' },
      { key: 'form' },
      { key: 'filters', element: 'tx-filters', optional: true },
      { key: 'export', element: 'tx-export', optional: true },
    ],
  },
  wallets: {
    route: 'Wallets',
    steps: [
      { key: 'intro', element: 'page-intro' },
      { key: 'add', element: 'page-add' },
      { key: 'networth', element: 'wallets-networth', optional: true },
      { key: 'transfer', element: 'wallets-transfer', optional: true },
      { key: 'balance' },
    ],
  },
  credits: {
    route: 'Credits',
    steps: [
      { key: 'intro', element: 'page-intro' },
      { key: 'add', element: 'page-add' },
      { key: 'payment', element: 'credits-payment', optional: true },
      { key: 'plan' },
    ],
  },
  budgets: {
    route: 'Budgets',
    steps: [
      { key: 'intro', element: 'page-intro' },
      { key: 'add', element: 'page-add' },
      { key: 'ai' },
      { key: 'track' },
    ],
  },
  goals: {
    route: 'Goals',
    steps: [
      { key: 'intro', element: 'page-intro' },
      { key: 'add', element: 'page-add' },
      { key: 'progress', element: 'goals-progress', optional: true },
    ],
  },
  simulators: {
    route: 'Simulators',
    steps: [
      { key: 'intro', element: 'page-intro' },
      { key: 'tabs', element: 'page-tabs' },
      { key: 'capacity' },
    ],
  },
  recurring: {
    route: 'Recurring',
    steps: [
      { key: 'intro', element: 'page-intro' },
      { key: 'add', element: 'page-add' },
      { key: 'upcoming', element: 'recurring-upcoming', optional: true },
    ],
  },
  categories: {
    route: 'Categories',
    steps: [
      { key: 'intro', element: 'page-intro' },
      { key: 'tabs', element: 'page-tabs' },
      { key: 'add', element: 'page-add' },
    ],
  },
  reports: {
    route: 'Reports',
    steps: [
      { key: 'intro', element: 'page-intro' },
      { key: 'tabs', element: 'page-tabs' },
      { key: 'period', element: 'reports-period', optional: true },
    ],
  },
  profile: {
    route: 'Profile',
    steps: [
      { key: 'intro', element: 'page-intro' },
      { key: 'personal', element: 'profile-personal', optional: true },
      { key: 'security', element: 'profile-security', optional: true },
      { key: 'ai', element: 'profile-ai', optional: true },
    ],
  },
}

// The tour that belongs to each screen (route name). The dashboard's is the welcome tour.
export const TOUR_BY_ROUTE = Object.fromEntries(
  Object.entries(TOURS).map(([id, tour]) => [tour.route, id])
)
