// Presentation only: keep stored category icons and names unchanged.
// Keyword → MDI icon, checked in order against the lowercased name (Spanish and English).
const CATEGORY_KEYWORDS = [
  [/aliment|comida|food|mercado|supermerc|grocer/, 'mdi-food-outline'],
  [/caf[eé]|cafeter|coffee/, 'mdi-coffee-outline'],
  [/restaurant|almuerzo|lunch|dinner/, 'mdi-silverware-fork-knife'],
  [/transport|taxi|uber|bus|metro/, 'mdi-bus'],
  [/carro|car\b|veh[ií]c|gasolina|fuel|parking|parqueadero/, 'mdi-car-outline'],
  [/vivienda|housing|home|hogar|arriendo|rent|alquiler/, 'mdi-home-outline'],
  [/servicio|utilit|luz|agua|gas\b|internet|energ/, 'mdi-lightning-bolt-outline'],
  [/salud|health|eps|m[eé]dic|farmac|pharm/, 'mdi-heart-pulse'],
  [/gym|gimnas|deporte|sport|fitness/, 'mdi-dumbbell'],
  [/cine|movie|ocio|entreten|entertain|juego|game/, 'mdi-movie-open-outline'],
  [/educa|colegio|universi|curso|school|course/, 'mdi-school-outline'],
  [/ropa|cloth|vestuario|moda/, 'mdi-tshirt-crew-outline'],
  [/tecnolog|tech|celular|phone|computador/, 'mdi-cellphone'],
  [/suscrip|subscript|netflix|spotify|streaming/, 'mdi-play-box-multiple-outline'],
  [/compra|shopping|tienda/, 'mdi-shopping-outline'],
  [/viaje|travel|vacacion|hotel|vuelo/, 'mdi-airplane'],
  [/mascota|pet|veterin/, 'mdi-paw'],
  [/regalo|gift|donaci/, 'mdi-gift-outline'],
  [/seguro|insurance/, 'mdi-shield-check-outline'],
  [/impuesto|tax|retenci|dian/, 'mdi-file-percent-outline'],
  [/pensi[oó]n|porvenir|colpensi|retiro/, 'mdi-piggy-bank-outline'],
  [/pr[eé]stamo|cr[eé]dito|loan|deuda|debt|cuota/, 'mdi-bank-outline'],
  [/tarjeta|card/, 'mdi-credit-card-outline'],
  [/manutenci|hijo|child|familia|family|apoyo/, 'mdi-account-heart-outline'],
  [/sueldo|salario|salary|n[oó]mina|payroll/, 'mdi-cash-multiple'],
  [/freelance|honorario|consult/, 'mdi-laptop'],
  [/inversi|invest|dividend|cdt|ahorro|saving/, 'mdi-chart-line'],
  [/venta|sale|negocio|business/, 'mdi-storefront-outline'],
  [/otro|other|varios|misc/, 'mdi-dots-horizontal-circle-outline'],
]

export const categoryIcon = (category) => {
  if (/^mdi-[a-z0-9-]+$/.test(category?.icon || '')) return category.icon
  const name = (category?.name || '').toLowerCase()
  const match = CATEGORY_KEYWORDS.find(([pattern]) => pattern.test(name))
  if (match) return match[1]
  if (category?.type === 'income' || /ingreso|income/.test(name)) return 'mdi-cash-plus'
  return 'mdi-shape-outline'
}

// Savings goals have no icon field: pick one from the goal's name.
const GOAL_KEYWORDS = [
  [/viaje|travel|vacacion|europa|trip/, 'mdi-airplane'],
  [/carro|moto|car\b|veh[ií]c/, 'mdi-car-outline'],
  [/casa|apartamento|mudanza|vivienda|home|house|move/, 'mdi-home-outline'],
  [/estudio|educa|universi|curso|school/, 'mdi-school-outline'],
  [/emergencia|emergency|fondo/, 'mdi-shield-check-outline'],
  [/boda|wedding/, 'mdi-ring'],
  [/retiro|pensi|retire/, 'mdi-beach'],
  [/celular|computador|laptop|tech/, 'mdi-laptop'],
]

export const goalIcon = (goal) => {
  const name = (goal?.name || '').toLowerCase()
  return GOAL_KEYWORDS.find(([pattern]) => pattern.test(name))?.[1] || 'mdi-target'
}
