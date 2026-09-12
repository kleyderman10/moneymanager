import { createRouter, createWebHistory } from 'vue-router'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { guest: true },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/ForgotPasswordView.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView.vue'),
      },
      {
        path: 'transactions',
        name: 'Transactions',
        component: () => import('@/views/TransactionsView.vue'),
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('@/views/CategoriesView.vue'),
      },
      {
        path: 'budgets',
        name: 'Budgets',
        component: () => import('@/views/BudgetsView.vue'),
      },
      {
        path: 'goals',
        name: 'Goals',
        component: () => import('@/views/GoalsView.vue'),
      },
      {
        path: 'wallets',
        name: 'Wallets',
        component: () => import('@/views/WalletsView.vue'),
      },
      {
        path: 'credits',
        name: 'Credits',
        component: () => import('@/views/CreditsView.vue'),
      },
      {
        path: 'recurring',
        name: 'Recurring',
        component: () => import('@/views/RecurringView.vue'),
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/ReportsView.vue'),
      },
      {
        path: 'simulators',
        name: 'Simulators',
        component: () => import('@/views/SimulatorsView.vue'),
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/ProfileView.vue'),
        meta: { billingExempt: true },
      },
      {
        path: 'subscription',
        name: 'Subscription',
        component: () => import('@/views/SubscriptionView.vue'),
        meta: { billingExempt: true },
      },
      {
        path: 'about',
        name: 'About',
        component: () => import('@/views/AboutView.vue'),
        meta: { billingExempt: true },
      },
      {
        path: 'admin',
        name: 'Admin',
        component: () => import('@/views/AdminView.vue'),
        meta: { billingExempt: true, requiresAdmin: true },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const token = localStorage.getItem('accessToken')
  if (to.meta.requiresAuth && !token) {
    return '/login'
  }
  if (to.meta.guest && token) return '/'

  if (to.meta.requiresAuth) {
    const subscriptionStore = useSubscriptionStore()
    await subscriptionStore.fetchStatus()
  }

  if (to.meta.requiresAdmin) {
    const authStore = useAuthStore()
    if (!authStore.user) await authStore.fetchProfile()
    if (!authStore.isAdmin) return '/'
  }

  return true
})

export default router
