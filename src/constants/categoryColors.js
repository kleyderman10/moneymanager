// Fixed palette for the well-known categories so the same category always renders with
// the same color everywhere (Inicio, Movimientos, etc.) instead of drifting per screen.
// Categories outside this list keep the color the user picked in Categorías.
const PALETTE = {
  'alimentación': { text: '#1F8A5C', bg: '#E6F3EE', mark: '#1F8A5C' },
  'otros gastos': { text: '#5B6B6E', bg: '#ECEEF0', mark: '#5B6B6E' },
  'préstamos': { text: '#B5563A', bg: '#FBE9E0', mark: '#D97757' },
  'cafetería': { text: '#7B4FA0', bg: '#F1E6F5', mark: '#7B4FA0' },
  'vivienda': { text: '#8B6F47', bg: '#F1EAE0', mark: '#8B6F47' },
  'cuota manutención': { text: '#B9822F', bg: '#FBEFDD', mark: '#E3A458' },
  'tecnología': { text: '#3F5EC2', bg: '#E7ECFB', mark: '#5B7FDE' },
  'tarjeta de crédito': { text: '#943D53', bg: '#F7E4E9', mark: '#B5566B' },
}

const FALLBACK = { text: '#5B6B6E', bg: '#ECEEF0', mark: '#8A99A0' }

const normalize = (name) => (name || '').trim().toLowerCase()

export const getCategoryColor = (category) => {
  const name = typeof category === 'string' ? category : category?.name
  const known = PALETTE[normalize(name)]
  if (known) return known

  const ownColor = typeof category === 'object' ? category?.color : null
  if (ownColor) return { text: ownColor, bg: ownColor, mark: ownColor }

  return FALLBACK
}

export const categoryMarkColor = (category) => getCategoryColor(category).mark
export const categoryTextColor = (category) => getCategoryColor(category).text
export const categoryBgColor = (category) => getCategoryColor(category).bg
