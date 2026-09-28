import { afterEach, describe, expect, it } from 'vitest';

import { setFrontComponentTranslations } from '@/sdk/front-component/translations/front-component-translations';
import { generateMessageId } from 'twenty-shared/i18n';
import { resolveTranslation } from '@/sdk/front-component/translations/resolveTranslation';

afterEach(() => {
  setFrontComponentTranslations({});
});

describe('resolveTranslation', () => {
  it('returns the translation for the active locale', () => {
    setFrontComponentTranslations({
      'pseudo-en': { [generateMessageId('Save')]: 'Enregistrer' },
    });

    expect(resolveTranslation('Save', undefined, 'pseudo-en')).toBe(
      'Enregistrer',
    );
  });

  it('falls back to the source message when the locale is missing', () => {
    setFrontComponentTranslations({
      'pseudo-en': { [generateMessageId('Save')]: 'Enregistrer' },
    });

    expect(resolveTranslation('Save', undefined, 'en')).toBe('Save');
  });

  it('falls back to the source message when the key is untranslated', () => {
    setFrontComponentTranslations({ 'pseudo-en': {} });

    expect(resolveTranslation('Cancel', undefined, 'pseudo-en')).toBe(
      'Cancel',
    );
  });

  it('resolves context-disambiguated messages independently', () => {
    setFrontComponentTranslations({
      'pseudo-en': {
        [generateMessageId('Open', 'door')]: 'Ouvrir',
        [generateMessageId('Open', 'window')]: 'Lever',
      },
    });

    expect(
      resolveTranslation(
        { message: 'Open', context: 'door' },
        undefined,
        'pseudo-en',
      ),
    ).toBe('Ouvrir');
    expect(
      resolveTranslation(
        { message: 'Open', context: 'window' },
        undefined,
        'pseudo-en',
      ),
    ).toBe('Lever');
  });

  it('interpolates values into the resolved translation', () => {
    setFrontComponentTranslations({
      'pseudo-en': {
        [generateMessageId('Saved {count} cards')]:
          'Cartes enregistrées : {count}',
      },
    });

    expect(
      resolveTranslation('Saved {count} cards', { count: 5 }, 'pseudo-en'),
    ).toBe('Cartes enregistrées : 5');
  });
});
