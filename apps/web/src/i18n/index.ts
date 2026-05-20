import { createI18n } from 'vue-i18n'
import englishMessages from './locales/en.json'

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: englishMessages,
  },
})
