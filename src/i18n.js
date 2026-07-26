import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // EN is the default for first-time visitors (owner decision, 2026-07-26);
    // a stored toggle choice (localStorage) wins. Browser language is
    // deliberately NOT consulted — "EN always default".
    fallbackLng: 'en',
    supportedLngs: ['pt', 'en'],
    defaultNS: 'translation',
    ns: ['translation'],

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'gmt-lang',
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;
