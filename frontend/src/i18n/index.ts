import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ko from './locales/ko.json';

i18n
  .use(LanguageDetector) // 브라우저 언어 감지
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ko: { translation: ko },
    },
    fallbackLng: 'en', // 기본 언어를 영어로 설정
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;