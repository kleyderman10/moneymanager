# Knexura Flow migration

## Implemented

| Phase | Files | Change |
| --- | --- | --- |
| 2 | src/main.js; src/styles/design-tokens.css; finance.css; flow.css | Dark Vuetify theme, shared tokens, legacy-variable compatibility, cards, inputs, buttons, focus and reduced-motion styles. Inter uses the existing font stack; no bundled Inter font was available. |
| 3 | src/layouts/MainLayout.vue; src/i18n/locales/es.js; en.js | Flow name and slogan, collapsible desktop sidebar, five mobile destinations, voice assistant moved to header. Wallets remain in the drawer. |
| 4 | src/views/DashboardView.vue; src/components/finance/BalanceCard.vue | Reusable balance card with hide/show control. Existing account-based net-worth calculation preserved. |
| 5 | src/views/TransactionsView.vue; src/utils/categoryIcon.js | Search over loaded transactions, MDI presentation, subdued expense amounts, dark summaries. Existing filters, capture, selection, import and export retained. |
| 6 | src/views/BudgetsView.vue; src/components/finance/BudgetCard.vue | Responsive cards with real spent/remaining/percentage values from existing monthly reports, one request per distinct period. Failed reports show unavailable progress. |
| 7 | src/views/GoalsView.vue | Goal icon, readable percentage outside progress bar, labelled edit/delete buttons. Existing saving/progress flows retained. |
| 8 | src/views/ReportsView.vue; src/constants/categoryColors.js | Aqua income, gold expense chart, dark chart labels/grid, adapted category palette. Existing monthly/yearly filters retained. |
| 9 | src/components/MoneyField.vue; CircularGauge.vue; InvestmentProjectionResults.vue; src/views/CategoriesView.vue; RecurringView.vue; WalletsView.vue; SimulatorsView.vue; SubscriptionView.vue | Shared dark form treatment, adapted surfaces and accents, MDI category selector. Stored category icons are not rewritten by presentation mapping. |
| 10 | index.html; vite.config.js; capacitor.config.json; Android strings.xml; iOS Info.plist; public/privacy.html; locale files | Flow display names, official icon/splash assets and PWA colors. Zoom enabled. Application/bundle IDs remain online.knexura.moneymanager. |

## Verification performed

- Existing dependencies installed with npm install; no new dependency introduced.
- Web production build passed after every implementation phase and final corrections.
- Capacitor-mode Vite build passed; this is not an Android or iOS binary build.
- Static identifier checks of nine changed component scripts passed.
- Category icon checks passed, including preservation of stored legacy icons.
- Authentication, API definitions, stores and backend source were not edited.
- npm audit reported 11 dependency vulnerabilities: 4 moderate, 6 high, 1 critical. No forced dependency migration applied.
- Vite retains a warning about bundles larger than 500 kB.

## Additional QA implementation

- Transaction and recurring desktop edit/delete icons are now labelled keyboard-accessible buttons, with wider action columns.
- Wallet edit/delete buttons, transaction pagination and mobile create buttons have accessible names.
- Icon buttons have a minimum 44px width; monetary inputs have a minimum 44px height and expose their label/required state to assistive technology.
- Transaction pagination clamps to the last available page when filtered results shrink, preventing an empty page after deletion.
- Web and Capacitor-mode builds passed. Browser inventory was checked again and remains empty; rendered QA remains pending.

## Outstanding verification

- Official assets supplied by the user are integrated. Original PNGs are preserved in src/assets/branding. The horizontal banner is used in login and About; screen mockups are references only. Native resources were generated with the installed @capacitor/assets tooling. iOS asset references, icon opacity and PWA dimensions were verified; generated iOS icon and Android portrait splash were visually inspected.
- Browser inventory was empty; no rendered desktop/tablet/mobile QA or authenticated end-to-end validation was possible in this session.
- iOS/Android device validation and native binary builds remain pending.
- Shared styles cover all routes, but screen-by-screen rendered review, touch targets and full WCAG validation remain pending. Do not treat the visual migration as fully approved until that review is complete.
- No lint/test scripts are defined in package.json.

## Flow redesign, second pass (mockups + supplied backgrounds)

| Area | Files | Change |
| --- | --- | --- |
| Tokens & theme | src/styles/design-tokens.css; src/main.js; @fontsource-variable/inter | Semantic `--kf-*` palette (old `--knexura-*`/`--finance-*` kept as aliases), Vuetify dark theme on the same values, Inter bundled locally (works offline in Capacitor). |
| Visual layer | src/styles/flow.css; finance.css (pruned) | Glass cards, hero cards, KPI/icon tiles, segmented tabs, fields, tables, insight alerts (gold), `.kf-row` mobile rows, FAB positioned above the bottom nav. |
| Backgrounds | src/assets/backgrounds/flow-bg-1..6.webp | The six supplied artworks converted to WebP (23–48 KB each). 5: auth screens, 6: app background, 4: drawer, 3: assistant sheet, 1: desktop auth panel, 2: hero cards. |
| Navigation | src/components/navigation/{MobileBottomNavigation,AppDrawer,VoiceActionButton}.vue; MainLayout.vue | Inicio · Movimientos · [Hablar] · Reportes · Menú; raised voice button calls the existing `openAssistant()` (AI-consent gate unchanged). Mic removed from the mobile header; mobile header shows avatar on main tabs and "back" elsewhere. Desktop keeps a compact voice button + Ctrl+Shift+Space. |
| Shared components | src/components/ui/KfSegmented.vue; src/components/finance/{KpiCard,BudgetCard}.vue; src/constants/chartTheme.js; src/utils/categoryIcon.js (+goalIcon) | Reused across Movimientos, Reportes, Metas, Simuladores, Admin. |
| Screens | Login/Register/Forgot, Dashboard, Transactions, Budgets, Reports, Wallets, Credits, Goals, Simulators, Recurring, Profile, Subscription, About, Admin | Markup/styles only; handlers, stores and API calls unchanged. Mobile tables (admin users/subscriptions, billing history, recurring) render as card rows. |

Fixes found during QA: invalid `mdi-auto-awesome` icon (rendered blank), progress-bar track tinted by the theme class, Profile form empty when the page was opened before the user profile loaded.

Pending: device validation on iOS/Android; iOS status-bar text color (no @capacitor/status-bar plugin; with UIViewControllerBasedStatusBarAppearance the style follows the system appearance and may render dark text on the dark header).
