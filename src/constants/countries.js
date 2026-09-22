// Países soportados para el selector de perfil. Cada país determina la moneda
// por defecto y el locale usado para formatear números, fechas y montos.
// `currency` puede sobrescribirse por separado (p. ej. una cuenta en USD
// para alguien que vive en Colombia), pero al elegir país se propone esta
// moneda como valor inicial.
export const COUNTRIES = [
  { code: 'CO', currency: 'COP', locale: 'es-CO', nameEs: 'Colombia', nameEn: 'Colombia', flag: '🇨🇴' },
  { code: 'MX', currency: 'MXN', locale: 'es-MX', nameEs: 'México', nameEn: 'Mexico', flag: '🇲🇽' },
  { code: 'AR', currency: 'ARS', locale: 'es-AR', nameEs: 'Argentina', nameEn: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', currency: 'CLP', locale: 'es-CL', nameEs: 'Chile', nameEn: 'Chile', flag: '🇨🇱' },
  { code: 'PE', currency: 'PEN', locale: 'es-PE', nameEs: 'Perú', nameEn: 'Peru', flag: '🇵🇪' },
  { code: 'EC', currency: 'USD', locale: 'es-EC', nameEs: 'Ecuador', nameEn: 'Ecuador', flag: '🇪🇨' },
  { code: 'BO', currency: 'BOB', locale: 'es-BO', nameEs: 'Bolivia', nameEn: 'Bolivia', flag: '🇧🇴' },
  { code: 'PY', currency: 'PYG', locale: 'es-PY', nameEs: 'Paraguay', nameEn: 'Paraguay', flag: '🇵🇾' },
  { code: 'UY', currency: 'UYU', locale: 'es-UY', nameEs: 'Uruguay', nameEn: 'Uruguay', flag: '🇺🇾' },
  { code: 'VE', currency: 'VES', locale: 'es-VE', nameEs: 'Venezuela', nameEn: 'Venezuela', flag: '🇻🇪' },
  { code: 'PA', currency: 'USD', locale: 'es-PA', nameEs: 'Panamá', nameEn: 'Panama', flag: '🇵🇦' },
  { code: 'CR', currency: 'CRC', locale: 'es-CR', nameEs: 'Costa Rica', nameEn: 'Costa Rica', flag: '🇨🇷' },
  { code: 'GT', currency: 'GTQ', locale: 'es-GT', nameEs: 'Guatemala', nameEn: 'Guatemala', flag: '🇬🇹' },
  { code: 'HN', currency: 'HNL', locale: 'es-HN', nameEs: 'Honduras', nameEn: 'Honduras', flag: '🇭🇳' },
  { code: 'SV', currency: 'USD', locale: 'es-SV', nameEs: 'El Salvador', nameEn: 'El Salvador', flag: '🇸🇻' },
  { code: 'NI', currency: 'NIO', locale: 'es-NI', nameEs: 'Nicaragua', nameEn: 'Nicaragua', flag: '🇳🇮' },
  { code: 'DO', currency: 'DOP', locale: 'es-DO', nameEs: 'República Dominicana', nameEn: 'Dominican Republic', flag: '🇩🇴' },
  { code: 'US', currency: 'USD', locale: 'en-US', nameEs: 'Estados Unidos', nameEn: 'United States', flag: '🇺🇸' },
  { code: 'ES', currency: 'EUR', locale: 'es-ES', nameEs: 'España', nameEn: 'Spain', flag: '🇪🇸' },
]

// Monedas que se pueden elegir de forma independiente del país (p. ej. una
// billetera o suscripción en una moneda distinta a la del perfil).
export const CURRENCIES = [
  { code: 'COP', nameEs: 'Peso colombiano', nameEn: 'Colombian peso' },
  { code: 'USD', nameEs: 'Dólar estadounidense', nameEn: 'US dollar' },
  { code: 'MXN', nameEs: 'Peso mexicano', nameEn: 'Mexican peso' },
  { code: 'ARS', nameEs: 'Peso argentino', nameEn: 'Argentine peso' },
  { code: 'CLP', nameEs: 'Peso chileno', nameEn: 'Chilean peso' },
  { code: 'PEN', nameEs: 'Sol peruano', nameEn: 'Peruvian sol' },
  { code: 'BOB', nameEs: 'Boliviano', nameEn: 'Bolivian boliviano' },
  { code: 'PYG', nameEs: 'Guaraní', nameEn: 'Paraguayan guaraní' },
  { code: 'UYU', nameEs: 'Peso uruguayo', nameEn: 'Uruguayan peso' },
  { code: 'VES', nameEs: 'Bolívar', nameEn: 'Venezuelan bolívar' },
  { code: 'CRC', nameEs: 'Colón costarricense', nameEn: 'Costa Rican colón' },
  { code: 'GTQ', nameEs: 'Quetzal', nameEn: 'Guatemalan quetzal' },
  { code: 'HNL', nameEs: 'Lempira', nameEn: 'Honduran lempira' },
  { code: 'NIO', nameEs: 'Córdoba', nameEn: 'Nicaraguan córdoba' },
  { code: 'DOP', nameEs: 'Peso dominicano', nameEn: 'Dominican peso' },
  { code: 'EUR', nameEs: 'Euro', nameEn: 'Euro' },
]

export const DEFAULT_COUNTRY_CODE = 'CO'

export const findCountry = (code) => COUNTRIES.find((c) => c.code === code) || null

// Locale a usar para formatear un monto en `currencyCode`, priorizando el país
// del usuario cuando su moneda coincide con la del país; si no coincide
// (p. ej. billetera en USD viviendo en Colombia), usa el locale del primer
// país que tenga esa moneda como propia, para no perder separadores de miles
// correctos según la convención regional de esa divisa.
export const localeForCurrency = (currencyCode, countryCode) => {
  const country = findCountry(countryCode)
  if (country && country.currency === currencyCode) return country.locale
  const match = COUNTRIES.find((c) => c.currency === currencyCode)
  return match ? match.locale : 'es-CO'
}
