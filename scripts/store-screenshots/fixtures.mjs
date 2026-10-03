// Datos demo para las capturas de tienda. Nada de esto toca el backend real:
// el script intercepta las llamadas a la API y responde con estos datos.
const DAY = 24 * 60 * 60 * 1000
const now = new Date()
const daysAgo = (n) => new Date(now.getTime() - n * DAY).toISOString()
const daysAhead = (n) => new Date(now.getTime() + n * DAY).toISOString()
const id = (n) => `64f0000000000000000000${String(n).padStart(2, '0')}`

export const TOURS = ['welcome', 'transactions', 'wallets', 'credits', 'budgets', 'goals', 'simulators', 'recurring', 'categories', 'reports', 'profile']

export const user = {
  _id: id(1),
  name: 'Camila Rojas',
  email: 'camila@example.com',
  currency: 'COP',
  country: 'CO',
  language: 'es',
  role: 'user',
  emailVerified: true,
  twoFactorEnabled: false,
  aiConsentAcceptedAt: daysAgo(30),
  completedTours: TOURS,
}

export const subscriptionStatus = {
  status: 'active',
  hasEntitlement: true,
  requiresSubscription: false,
  isReadOnly: false,
  accessMode: 'full',
  daysRemaining: null,
}

const cat = (n, name, type, icon, color) => ({ _id: id(n), name, type, icon, color })
export const categories = [
  cat(10, 'Comida', 'expense', 'mdi-food', '#FB8C00'),
  cat(11, 'Transporte', 'expense', 'mdi-bus', '#1E88E5'),
  cat(12, 'Mercado', 'expense', 'mdi-cart', '#43A047'),
  cat(13, 'Entretenimiento', 'expense', 'mdi-movie-open', '#8E24AA'),
  cat(14, 'Salud', 'expense', 'mdi-heart-pulse', '#E53935'),
  cat(15, 'Servicios', 'expense', 'mdi-lightning-bolt', '#FDD835'),
  cat(16, 'Salario', 'income', 'mdi-cash', '#00C853'),
  cat(17, 'Freelance', 'income', 'mdi-laptop', '#26C6DA'),
]
const c = (n) => categories.find((x) => x._id === id(n))

const walletRef = (n, name, type) => ({ _id: id(n), name, type })
const WALLETS = {
  cash: walletRef(20, 'Efectivo', 'cash'),
  bank: walletRef(21, 'Cuenta de nómina', 'bank'),
  card: walletRef(22, 'Tarjeta Visa', 'credit'),
}

export const wallets = [
  { _id: id(20), name: 'Efectivo', type: 'cash', accountKind: 'cash', balance: 185000, currency: 'COP', institution: null },
  { _id: id(21), name: 'Cuenta de nómina', type: 'bank', accountKind: 'savings', balance: 4820000, currency: 'COP', institution: null },
  {
    _id: id(22),
    name: 'Tarjeta Visa',
    type: 'credit',
    accountKind: 'credit_card',
    balance: -1850000,
    currency: 'COP',
    creditLimit: 6000000,
    annualInterestRate: 28,
    managementFee: 25000,
    managementFeePeriod: 'monthly',
    minimumPaymentRate: 5,
    cutOffDay: 15,
    paymentDueDay: 5,
    institution: null,
    creditSummary: {
      creditLimit: 6000000,
      usedCredit: 1850000,
      availableCredit: 4150000,
      utilizationRate: 30.83,
      cyclePurchases: 920000,
      cyclePayments: 0,
      estimatedInterest: 43167,
      managementFee: 25000,
      monthlyManagementFee: 25000,
      minimumPayment: 160000,
      annualInterestRate: 28,
      minimumPaymentRate: 5,
      cutOffDay: 15,
      paymentDueDay: 5,
      nextCutOffDate: daysAhead(9),
      nextPaymentDate: daysAhead(5),
      daysUntilCutOff: 9,
      daysUntilPayment: 5,
      advice: ['Tu utilización está en un rango saludable. Mantén compras que puedas pagar completas.'],
    },
  },
]

const reg = (n, type, amount, ago, description, category, wallet, extra = {}) => ({
  _id: id(100 + n),
  type,
  amount,
  date: daysAgo(ago),
  description,
  category,
  wallet,
  tags: [],
  installments: 1,
  installmentsPaid: 0,
  ...extra,
})

export const registers = [
  reg(1, 'expense', 62000, 0, 'Almuerzo con el equipo', c(10), WALLETS.card),
  reg(2, 'expense', 18500, 0, 'Taxi al aeropuerto', c(11), WALLETS.cash),
  reg(3, 'expense', 284000, 1, 'Mercado de la semana', c(12), WALLETS.bank),
  reg(4, 'income', 3200000, 2, 'Nómina quincena', c(16), WALLETS.bank),
  reg(5, 'expense', 45900, 2, 'Netflix + Spotify', c(13), WALLETS.card),
  reg(6, 'expense', 139000, 3, 'Consulta médica', c(14), WALLETS.bank),
  reg(7, 'expense', 210000, 4, 'Factura de energía', c(15), WALLETS.bank),
  reg(8, 'income', 650000, 5, 'Proyecto freelance', c(17), WALLETS.bank),
  reg(9, 'expense', 89000, 6, 'Cena de cumpleaños', c(10), WALLETS.card),
  reg(10, 'expense', 52000, 7, 'Gasolina', c(11), WALLETS.cash),
]

export const summary = {
  totalIncome: 4150000,
  totalExpenses: 2315000,
  balance: 1835000,
  incomeCount: 3,
  expenseCount: 19,
  transactionCount: 22,
  byCategory: [
    { type: 'expense', category: c(12), total: 620000, count: 5 },
    { type: 'expense', category: c(10), total: 480000, count: 7 },
    { type: 'expense', category: c(15), total: 410000, count: 3 },
    { type: 'expense', category: c(11), total: 290000, count: 4 },
    { type: 'expense', category: c(13), total: 280000, count: 3 },
    { type: 'expense', category: c(14), total: 235000, count: 2 },
    { type: 'income', category: c(16), total: 3500000, count: 2 },
    { type: 'income', category: c(17), total: 650000, count: 1 },
  ],
}

export const capacity = {
  capacity: { averageIncome: 4100000, averageExpenses: 2600000, averageSurplus: 1500000 },
}

export const healthScore = {
  score: 82,
  label: 'Excelente',
  breakdown: { ahorro: 88, presupuesto: 79, deuda: 85 },
}

export const insights = [
  {
    _id: id(300),
    type: 'saving_tip',
    title: 'Vas muy bien este mes',
    description: 'Tus gastos en comida bajaron 12% frente al mes pasado. Si mantienes el ritmo, puedes ahorrar $180.000 más.',
    severity: 'low',
  },
]

export const budgets = [
  { _id: id(400), category: c(12), amount: 800000, month: now.getMonth() + 1, year: now.getFullYear() },
  { _id: id(401), category: c(10), amount: 600000, month: now.getMonth() + 1, year: now.getFullYear() },
  { _id: id(402), category: c(13), amount: 250000, month: now.getMonth() + 1, year: now.getFullYear() },
  { _id: id(403), category: c(11), amount: 350000, month: now.getMonth() + 1, year: now.getFullYear() },
]

const spent = [620000, 480000, 280000, 290000]
const budgetStatus = budgets.map((b, i) => ({
  budget: b,
  spent: spent[i],
  remaining: b.amount - spent[i],
  percentage: Math.round((spent[i] / b.amount) * 100),
  exceeded: spent[i] > b.amount,
}))

export const monthlyReport = {
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  summary: { ...summary },
  previousSummary: { totalIncome: 3900000, totalExpenses: 2520000, balance: 1380000, byCategory: [] },
  incomeChange: 6,
  expenseChange: -8,
  budgetStatus,
}

export const yearlyReport = {
  year: now.getFullYear(),
  months: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    totalIncome: 3600000 + (i % 4) * 150000,
    totalExpenses: 2300000 + ((i * 7) % 5) * 120000,
    balance: 1300000 + (i % 3) * 90000,
  })),
}

export const goals = [
  { _id: id(500), name: 'Viaje a Cartagena', targetAmount: 4000000, currentAmount: 2600000, percentage: 65, remaining: 1400000, deadline: daysAhead(150), icon: 'mdi-airplane', color: '#26C6DA' },
  { _id: id(501), name: 'Fondo de emergencia', targetAmount: 10000000, currentAmount: 4200000, percentage: 42, remaining: 5800000, deadline: daysAhead(300), icon: 'mdi-shield-check', color: '#43A047' },
  { _id: id(502), name: 'Portátil nuevo', targetAmount: 3500000, currentAmount: 3500000, percentage: 100, remaining: 0, deadline: daysAgo(10), icon: 'mdi-laptop', color: '#8E24AA' },
]

export const upcoming = [
  { _id: id(600), description: 'Arriendo', amount: 1400000, type: 'expense', nextOccurrence: daysAhead(3), category: c(15) },
]

export const paymentPlan = {
  items: [
    { registerId: id(700), description: 'Nevera Samsung', date: daysAgo(70), amount: 2400000, installments: 12, installmentsPaid: 3, installmentsPending: 9, installmentAmount: 200000, remainingPrincipal: 1800000, interest: 42000, billed: true },
  ],
  untrackedBalance: 50000,
  interest: 42000,
  managementFee: 25000,
  cost: 67000,
  usedCredit: 1850000,
  options: {
    minimum: { principal: 92500, cost: 67000, total: 159500 },
    installment: { principal: 200000, cost: 67000, total: 267000 },
    total: { principal: 1850000, cost: 67000, total: 1917000 },
  },
  nextPaymentDate: daysAhead(5),
}

export const cardStatement = {
  movements: [
    { _id: id(800), date: daysAgo(0), description: 'Almuerzo con el equipo', category: { name: 'Comida' }, type: 'expense', amount: 62000, kind: 'purchase', installments: 1, installmentsPaid: 0, installmentAmount: 62000, remainingPrincipal: 62000, billed: false, settled: false },
    { _id: id(801), date: daysAgo(2), description: 'Netflix + Spotify', category: { name: 'Entretenimiento' }, type: 'expense', amount: 45900, kind: 'purchase', installments: 1, installmentsPaid: 0, installmentAmount: 45900, remainingPrincipal: 45900, billed: false, settled: false },
    { _id: id(802), date: daysAgo(6), description: 'Cena de cumpleaños', category: { name: 'Comida' }, type: 'expense', amount: 89000, kind: 'purchase', installments: 3, installmentsPaid: 0, installmentAmount: 29667, remainingPrincipal: 89000, billed: false, settled: false },
    { _id: id(803), date: daysAgo(40), description: 'Pago de tarjeta', category: { name: 'Pago tarjeta' }, type: 'income', amount: 400000, kind: 'payment', installments: 1, installmentsPaid: 0, installmentAmount: 0, remainingPrincipal: 0, billed: true, settled: false },
    { _id: id(804), date: daysAgo(70), description: 'Nevera Samsung', category: { name: 'Hogar' }, type: 'expense', amount: 2400000, kind: 'purchase', installments: 12, installmentsPaid: 3, installmentAmount: 200000, remainingPrincipal: 1800000, billed: true, settled: false },
  ],
  usedCredit: 1850000,
  billedBalance: 1653100,
  unbilledBalance: 196900,
  interest: 42000,
  managementFee: 25000,
  options: paymentPlan.options,
  nextPaymentDate: daysAhead(5),
}
