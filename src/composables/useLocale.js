import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { findCountry, localeForCurrency, DEFAULT_COUNTRY_CODE } from '@/constants/countries'
import {
  formatMoney,
  formatCompactMoney,
  formatNumber,
  formatPercent,
  formatDate,
  formatDateLong,
} from '@/utils/format'

// Composable central para formatear moneda, números y fechas según el país
// y la moneda configurados en el perfil del usuario. Cuando no hay usuario
// autenticado (login, registro) cae a los valores por defecto (Colombia/COP).
export function useLocale() {
  const authStore = useAuthStore()

  const country = computed(() => authStore.user?.country || DEFAULT_COUNTRY_CODE)
  const currency = computed(() => authStore.user?.currency || findCountry(country.value)?.currency || 'COP')
  const locale = computed(() => localeForCurrency(currency.value, country.value))

  const money = (value, walletCurrency, options) => (
    formatMoney(value, walletCurrency || currency.value, localeForCurrency(walletCurrency || currency.value, country.value), options)
  )
  const compactMoney = (value, walletCurrency) => (
    formatCompactMoney(value, walletCurrency || currency.value, localeForCurrency(walletCurrency || currency.value, country.value))
  )
  const number = (value, options) => formatNumber(value, locale.value, options)
  const percent = (value, maximumFractionDigits) => formatPercent(value, locale.value, maximumFractionDigits)
  const date = (value, options) => formatDate(value, locale.value, options)
  const dateLong = (value, options) => formatDateLong(value, locale.value, options)

  return { country, currency, locale, money, compactMoney, number, percent, date, dateLong }
}
