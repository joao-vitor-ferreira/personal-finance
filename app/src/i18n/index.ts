import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import ptBR from './locales/pt-BR';
import enUS from './locales/en-US';

const deviceLocale = getLocales()[0]?.languageTag ?? 'pt-BR';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': {
        translation: ptBR,
      },
      'en-US': {
        translation: enUS,
      },
    },

    lng: deviceLocale,
    fallbackLng: 'pt-BR',

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;