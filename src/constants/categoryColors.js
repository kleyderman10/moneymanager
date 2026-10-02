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

const normalize = (name) => (name || '').trim().toLowerCase()

export const getCategoryColor = (category) => {
  const name = typeof category === 'string' ? category : category?.name
  const known = PALETTE[normalize(name)]
  if (known) return known

  const ownColor = typeof category === 'object' ? category?.color : null
  if (/^#[0-9a-f]{6}$/i.test(ownColor || '')) return { text: '#E8EFF2', bg: ownColor + '22', mark: ownColor }

  return FALLBACK
}

export const categoryMarkColor = (category) => getCategoryColor(category).mark
export const categoryTextColor = (category) => getCategoryColor(category).text
export const categoryBgColor = (category) => getCategoryColor(category).bg
