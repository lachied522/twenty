import { SOURCE_LOCALE } from '@/translations/constants/SourceLocale';

export const APP_LOCALES = {
  en: SOURCE_LOCALE,
  // Lingui pseudo-locale for spotting missing translations in development.
  // Hidden from the locale picker outside development.
  'pseudo-en': 'pseudo-en',
} as const;

export type AppLocale = keyof typeof APP_LOCALES;
