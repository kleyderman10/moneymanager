// Fixed palette for the well-known categories so the same category always renders with
// the same color everywhere (Inicio, Movimientos, etc.) instead of drifting per screen.
// Categories outside this list keep the color the user picked in Categorías.
const PALETTE = {
  'alimentación': { text: '#22D3C5', bg: '#0C3545', mark: '#22D3C5' },
  'otros gastos': { text: '#93A7B0', bg: '#0C3545', mark: '#93A7B0' },
  'préstamos': { text: '#F4B860', bg: '#0C3545', mark: '#F4B860' },
  'cafetería': { text: '#65E6DD', bg: '#0C3545', mark: '#65E6DD' },
  'vivienda': { text: '#FFD88A', bg: '#0C3545', mark: '#FFD88A' },
  'cuota manutención': { text: '#F4B860', bg: '#0C3545', mark: '#F4B860' },
  'tecnología': { text: '#65E6DD', bg: '#0C3545', mark: '#65E6DD' },
  'tarjeta de crédito': { text: '#F4B860', bg: '#0C3545', mark: '#FFD88A' },
}

const FALLBACK = { text: '#93A7B0', bg: '#0C3545', mark: '#8A99A0' }

// Categories created without a color (the assistant and the importers create them that way)
// would all share the grey fallback, and a chart of five grey slices says nothing. Each name
// maps to one color of this rotation, always the same one. No red: red means "expense".
// The API stores this grey when a category is created without a color: it means "not chosen".
const UNSET_COLOR = '#808080'
const ROTATION = ['#22D3C5', '#F4B860', '#5CC8FF', '#A7F3D0', '#FFD88A', '#7FB2FF', '#65E6DD', '#F6A6C1']
const rotationColor = (name) => {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)) % 9973
  return ROTATION[hash % ROTATION.length]
}

const normalize = (name) => (name || '').trim().toLowerCase()

export const getCategoryColor = (category) => {
  const name = typeof category === 'string' ? category : category?.name
  const known = PALETTE[normalize(name)]
  if (known) return known

  const ownColor = typeof category === 'object' ? category?.color : null
  if (/^#[0-9a-f]{6}$/i.test(ownColor || '') && ownColor.toLowerCase() !== UNSET_COLOR) return { text: '#E8EFF2', bg: ownColor + '22', mark: ownColor }

  const key = normalize(name)
  if (key) {
    const mark = rotationColor(key)
    return { text: mark, bg: '#0C3545', mark }
  }
  return FALLBACK
}

export const categoryMarkColor = (category) => getCategoryColor(category).mark

// Colors for a set of categories drawn together (a chart): each keeps its usual color, and
// when two would look the same the later one takes the next free color of the rotation.
export const distinctCategoryColors = (categories) => {
  const used = new Set()
  return categories.map((category) => {
    let color = getCategoryColor(category).mark
    if (used.has(color)) color = ROTATION.find((option) => !used.has(option)) || color
    used.add(color)
    return color
  })
}
export const categoryTextColor = (category) => getCategoryColor(category).text
export const categoryBgColor = (category) => getCategoryColor(category).bg
