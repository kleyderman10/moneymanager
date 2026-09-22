// Funciones puras de formato de números, moneda, porcentajes y fechas.
// No dependen de Vue ni de Pinia para poder usarse también dentro de
// callbacks de Chart.js u otros contextos no reactivos.

export const formatMoney = (value, currency = 'COP', locale = 'es-CO', options = {}) => (
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    ...options,
  }).format(Number(value) || 0)
)

export const formatCompactMoney = (value, currency = 'COP', locale = 'es-CO') => (
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value) || 0)
)

export const formatNumber = (value, locale = 'es-CO', options = {}) => (
  Number(value || 0).toLocaleString(locale, options)
)

export const formatPercent = (value, locale = 'es-CO', maximumFractionDigits = 1) => (
  `${Number(value || 0).toLocaleString(locale, { maximumFractionDigits })}%`
)

export const formatDate = (value, locale = 'es-CO', options = { day: 'numeric', month: 'short', year: 'numeric' }) => (
  value ? new Intl.DateTimeFormat(locale, options).format(new Date(value)) : ''
)

export const formatDateLong = (value, locale = 'es-CO', options = { month: 'long', year: 'numeric', timeZone: 'UTC' }) => (
  value ? new Intl.DateTimeFormat(locale, options).format(new Date(value)) : ''
)
