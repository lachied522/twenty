import { isObject } from '@sniptt/guards';
import { type Locale } from 'date-fns';
import { type APP_LOCALES } from 'twenty-shared/translations';

type AppLocale = keyof typeof APP_LOCALES;
export const getDateFnsLocaleImport = (locale: AppLocale) => {
  switch (locale) {
    case 'en':
    case 'pseudo-en':
      return import('date-fns/locale/en-US');
    default: {
      // getDateFnsLocale passes an arbitrary string, so unknown input still
      // lands here at runtime. A locale in APP_LOCALES must not: without this
      // the switch would silently format its dates in US English, and nothing
      // - not a type, not a test, not a lint rule - would say so.
      locale satisfies never;

      return import('date-fns/locale/en-US');
    }
  }
};

const isDateFnsLocale = (value: unknown): value is Locale =>
  isObject(value) && 'code' in value && 'formatLong' in value;

export const getDateFnsLocale = async (
  localeString?: string | null,
): Promise<Locale | undefined> => {
  return getDateFnsLocaleImport(localeString as AppLocale)
    .then((localeModule) => Object.values(localeModule).find(isDateFnsLocale))
    .catch(() => undefined);
};
