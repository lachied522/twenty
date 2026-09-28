import { type Messages } from '@lingui/core';
import { createI18nInstanceFactory } from 'twenty-shared/i18n';
import { type APP_LOCALES } from 'twenty-shared/translations';
import { messages as enMessages } from '@/locales/generated/en';
import { messages as pseudoEnMessages } from '@/locales/generated/pseudo-en';

const messages: Record<keyof typeof APP_LOCALES, Messages> = {
  en: enMessages,
  'pseudo-en': pseudoEnMessages,
};

export const createI18nInstance = createI18nInstanceFactory(messages);
