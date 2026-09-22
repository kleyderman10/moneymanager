import { createI18n } from 'vue-i18n'
import es from './locales/es'
import en from './locales/en'

export const SUPPORTED_LANGUAGES = ['es', 'en']
export const DEFAULT_LANGUAGE = 'es'

const detectLanguage = () => {
  const stored = localStorage.getItem('language')
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored
  const browserLang = (navigator.language || '').slice(0, 2)
  return SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : DEFAULT_LANGUAGE
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: detectLanguage(),
  fallbackLocale: DEFAULT_LANGUAGE,
  messages: { es, en },
})

export const setLanguage = (lang) => {
  if (!SUPPORTED_LANGUAGES.includes(lang)) return
  i18n.global.locale.value = lang
  localStorage.setItem('language', lang)
  document.documentElement.setAttribute('lang', lang)
}
