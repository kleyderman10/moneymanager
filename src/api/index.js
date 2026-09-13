import api from './client'

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  resendVerification: (data) => api.post('/auth/resend-verification', data),
  login: (data) => api.post('/auth/login', data),
  verifyTwoFactor: (data) => api.post('/auth/2fa/verify', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  refreshToken: (data) => api.post('/auth/refresh-token', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  requestTwoFactorSetup: () => api.post('/auth/2fa/setup/send'),
  confirmTwoFactorSetup: (data) => api.post('/auth/2fa/setup/verify', data),
  requestTwoFactorDisable: (data) => api.post('/auth/2fa/disable/send', data),
  disableTwoFactor: (data) => api.post('/auth/2fa/disable', data),
}

export const webauthnAPI = {
  registerOptions: () => api.post('/auth/webauthn/register-options'),
  registerVerify: (data) => api.post('/auth/webauthn/register-verify', data),
  loginOptions: (credentialId) => api.post('/auth/webauthn/login-options', { credentialId }),
  loginVerify: (data) => api.post('/auth/webauthn/login-verify', data),
  status: () => api.get('/auth/webauthn/status'),
  removeCredential: (id) => api.delete(`/auth/webauthn/credentials/${id}`),
  removeAll: () => api.delete('/auth/webauthn/credentials'),
}

export const categoriesAPI = {
  getAll: (params) => api.get('/categories', { params }),
  getById: (id) => api.get(`/categories/${id}`),
  getSubcategories: (id) => api.get(`/categories/${id}/subcategories`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
}

export const registersAPI = {
  getAll: (params) => api.get('/registers', { params }),
  getById: (id) => api.get(`/registers/${id}`),
  create: (data) => api.post('/registers', data),
  update: (id, data) => api.put(`/registers/${id}`, data),
  delete: (id) => api.delete(`/registers/${id}`),
  exportCSV: (params) => api.get('/registers/export', { params, responseType: 'blob' }),
  getTags: () => api.get('/registers/tags'),
}

export const summaryAPI = {
  get: (params) => api.get('/summary', { params }),
}

export const simulationsAPI = {
  capacity: (params) => api.get('/simulations/capacity', { params }),
  cardViability: (params) => api.get('/simulations/card-viability', { params }),
  loan: (data) => api.post('/simulations/loan', data),
  cdt: (data) => api.post('/simulations/cdt', data),
  savings: (data) => api.post('/simulations/savings', data),
}

export const creditsAPI = {
  getAll: () => api.get('/credits'),
  getById: (id) => api.get(`/credits/${id}`),
  create: (data) => api.post('/credits', data),
  update: (id, data) => api.put(`/credits/${id}`, data),
  addPayment: (id, data) => api.post(`/credits/${id}/payments`, data),
  deletePayment: (id, paymentId) => api.delete(`/credits/${id}/payments/${paymentId}`),
  delete: (id) => api.delete(`/credits/${id}`),
}

export const reportsAPI = {
  monthly: (year, month) => api.get(`/reports/monthly/${year}/${month}`),
  yearly: (year) => api.get(`/reports/yearly/${year}`),
}

export const budgetsAPI = {
  getAll: (params) => api.get('/budgets', { params }),
  getById: (id) => api.get(`/budgets/${id}`),
  create: (data) => api.post('/budgets', data),
  upsert: (data) => api.put('/budgets/upsert', data),
  update: (id, data) => api.put(`/budgets/${id}`, data),
  delete: (id) => api.delete(`/budgets/${id}`),
}

export const goalsAPI = {
  getAll: () => api.get('/goals'),
  getById: (id) => api.get(`/goals/${id}`),
  create: (data) => api.post('/goals', data),
  update: (id, data) => api.put(`/goals/${id}`, data),
  addProgress: (id, data) => api.post(`/goals/${id}/progress`, data),
  delete: (id) => api.delete(`/goals/${id}`),
}

export const walletsAPI = {
  getAll: () => api.get('/wallets'),
  getById: (id) => api.get(`/wallets/${id}`),
  create: (data) => api.post('/wallets', data),
  update: (id, data) => api.put(`/wallets/${id}`, data),
  transfer: (data) => api.post('/wallets/transfer', data),
  delete: (id) => api.delete(`/wallets/${id}`),
}

export const financialInstitutionsAPI = {
  getAll: (product) => api.get('/financial-institutions', { params: product ? { product } : undefined }),
}

export const recurringAPI = {
  getAll: () => api.get('/recurring'),
  getById: (id) => api.get(`/recurring/${id}`),
  getUpcoming: (days) => api.get('/recurring/upcoming', { params: { days } }),
  create: (data) => api.post('/recurring', data),
  update: (id, data) => api.put(`/recurring/${id}`, data),
  delete: (id) => api.delete(`/recurring/${id}`),
  processRecurring: () => api.post('/recurring/process'),
}

export const aiAPI = {
  chat: (message) => api.post('/ai/chat', { message }),
  getChatHistory: () => api.get('/ai/chat'),
  clearChat: () => api.delete('/ai/chat'),
  generateIcon: (data) => api.post('/ai/generate-icon', data),
  getInsights: () => api.get('/ai/insights'),
  refreshInsights: () => api.post('/ai/insights/refresh'),
  dismissInsight: (id) => api.put(`/ai/insights/${id}/dismiss`),
  analyze: () => api.post('/ai/analyze'),
  suggestCategory: (data) => api.post('/ai/suggest-category', data),
  predictBudget: (data) => api.post('/ai/predict-budget', data),
  parseVoice: (text) => api.post('/ai/voice', { text }),
  scanReceipt: (image) => api.post('/ai/scan-receipt', { image }),
  healthScore: () => api.get('/ai/health-score'),
}

export const statementsAPI = {
  analyze: (data) => api.post('/statements/analyze', data),
  import: (data) => api.post('/statements/import', data),
}

export const subscriptionsAPI = {
  getPlans: () => api.get('/subscriptions/plans'),
  getStatus: () => api.get('/subscriptions/status'),
  getPayments: () => api.get('/subscriptions/payments'),
  createCheckout: (planCode) => api.post('/subscriptions/checkout', { planCode }),
  sync: () => api.post('/subscriptions/sync'),
  cancel: () => api.post('/subscriptions/cancel'),
  reactivate: () => api.post('/subscriptions/reactivate'),
  verifyApplePurchase: (originalTransactionId) => api.post('/subscriptions/apple/verify', { originalTransactionId }),
}

export const adminAPI = {
  getOverview: () => api.get('/admin/overview'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  setUserStatus: (id, isActive) => api.patch(`/admin/users/${id}/status`, { isActive }),
  setUserRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  getSubscriptions: (params) => api.get('/admin/subscriptions', { params }),
  updateSubscription: (id, data) => api.patch(`/admin/subscriptions/${id}`, data),
}
